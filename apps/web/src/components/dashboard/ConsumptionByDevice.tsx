'use client';

import { BarChart3, Table2 } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmt } from '@/lib/format';
import { useHouseConsumption } from '@/lib/hooks';
import type { Device, Period } from '@/lib/types';
import { AXIS_TICK, GRID_STROKE, TooltipBox } from '../charts/ChartTooltip';
import { Card, CardHeader, Empty, Segmented } from '../ui';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: '7 dias' },
  { value: 'month', label: 'Mês' },
];
const PERIOD_TEXT: Record<Period, string> = { day: 'hoje', week: 'nos últimos 7 dias', month: 'neste mês' };

type ShapeProps = { x?: number; y?: number; width?: number; height?: number; fill?: string; payload?: Record<string, number> };

/**
 * Segmento da pilha: 2px de respiro entre segmentos e cantos arredondados
 * só no topo da pilha (o último segmento com valor naquela barra).
 */
function stackShape(key: string, order: string[]) {
  return function Segment(props: ShapeProps) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload = {} } = props;
    if (height <= 0.5) return null;
    const above = order.slice(order.indexOf(key) + 1);
    const isTop = above.every((k) => !payload[k]);
    const h = Math.max(height - 2, 1);
    const top = y + (height - h);
    const r = isTop ? Math.min(4, width / 2, h) : 0;
    const d = `M${x},${top + h} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + width - r},${top} Q${x + width},${top} ${x + width},${top + r} L${x + width},${top + h} Z`;
    return <path d={d} fill={fill} />;
  };
}

export function ConsumptionByDevice({ devices, colors }: { devices: Device[] | null; colors: Record<string, string> }) {
  const [period, setPeriod] = useState<Period>('day');
  const [table, setTable] = useState(false);
  const data = useHouseConsumption(period);
  const order = (devices ?? []).map((d) => d.id);
  const names = Object.fromEntries((devices ?? []).map((d) => [d.id, d.name]));
  const rows = (data?.buckets ?? []).map((b) => ({ label: b.label, future: b.future, total: b.kwh, ...(b.byDevice ?? {}) }));
  const legend = [...(data?.devices ?? [])].sort((a, b) => b.kwh - a.kwh);
  const stale = data && data.period !== period;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Consumo por aparelho"
        sub={data ? `${fmt.kwh(data.totalKwh)} · ${fmt.brl(data.totalCost)} ${PERIOD_TEXT[data.period]}` : 'Carregando…'}
        right={
          <div className="flex items-center gap-2">
            <Segmented value={period} options={PERIODS} onChange={setPeriod} />
            <button
              onClick={() => setTable((t) => !t)}
              className="rounded-lg border border-border bg-surface-2 p-1.5 text-muted transition hover:text-text"
              aria-label={table ? 'Ver gráfico' : 'Ver tabela'}
              title={table ? 'Ver gráfico' : 'Ver tabela'}
            >
              {table ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            </button>
          </div>
        }
      />

      <div className={`px-3 transition-opacity ${stale ? 'opacity-50' : ''}`}>
        {!data ? (
          <div className="h-72" />
        ) : data.totalKwh === 0 && !table ? (
          <Empty className="h-72">Sem consumo registrado {PERIOD_TEXT[data.period]}</Empty>
        ) : table ? (
          <div className="max-h-72 overflow-auto px-2">
            <table className="tabular w-full text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-muted">
                <tr>
                  <th className="py-2 pr-3 text-left font-medium">{period === 'day' ? 'Hora' : 'Dia'}</th>
                  {order.map((id) => (
                    <th key={id} className="px-2 py-2 text-right font-medium">
                      {names[id]}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => !r.future)
                  .map((r) => (
                    <tr key={r.label} className="border-t border-border">
                      <td className="py-1.5 pr-3 text-text-2">{r.label}</td>
                      {order.map((id) => (
                        <td key={id} className="px-2 py-1.5 text-right text-text-2">
                          {fmt.kwhNum((r as unknown as Record<string, number>)[id] ?? 0)}
                        </td>
                      ))}
                      <td className="py-1.5 pl-2 text-right font-medium">{fmt.kwhNum(r.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  axisLine={{ stroke: '#2b3644' }}
                  tickLine={false}
                  interval={period === 'day' ? 2 : period === 'month' ? 'preserveStartEnd' : 0}
                  minTickGap={4}
                />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickCount={5}
                  tickFormatter={(v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: v < 1 ? 2 : 1 })}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as Record<string, number | string | boolean>;
                    if (p.future) return null;
                    return (
                      <TooltipBox
                        title={`${period === 'day' ? 'Das' : 'Dia'} ${p.label}`}
                        rows={[
                          { label: 'total', value: fmt.kwh(p.total as number), strong: true },
                          ...[...order]
                            .reverse()
                            .map((id) => ({ color: colors[id], label: names[id], value: fmt.kwh((p[id] as number) ?? 0) })),
                        ]}
                      />
                    );
                  }}
                />
                {order.map((id) => (
                  <Bar
                    key={id}
                    dataKey={id}
                    name={names[id]}
                    stackId="kwh"
                    fill={colors[id]}
                    maxBarSize={24}
                    isAnimationActive={false}
                    shape={stackShape(id, order)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legenda = ranking do período (cor fixa por aparelho, ordem por consumo) */}
      <ul className="mt-auto grid gap-x-6 gap-y-3 border-t border-border px-5 py-4 sm:grid-cols-2 2xl:grid-cols-3">
        {legend.map((d) => (
          <li key={d.id} className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colors[d.id] }} />
              <span className="min-w-0 flex-1 truncate text-text-2">{d.name}</span>
              <span className="tabular shrink-0 font-medium">{fmt.kwh(d.kwh)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 pl-[18px]">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full" style={{ width: `${d.share * 100}%`, background: colors[d.id] }} />
              </div>
              <span className="tabular w-24 shrink-0 text-right text-xs text-muted">
                {fmt.pct(d.share)} · {fmt.brl(d.cost)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

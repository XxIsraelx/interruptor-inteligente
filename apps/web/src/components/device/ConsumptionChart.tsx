'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import type { ConsumptionSeries, Period } from '@/lib/types';
import { AXIS_TICK, GRID_STROKE, TooltipBox } from '../charts/ChartTooltip';
import { Card, CardHeader, Empty, Segmented } from '../ui';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: '7 dias' },
  { value: 'month', label: 'Mês' },
];
const PERIOD_TEXT: Record<Period, string> = { day: 'hoje', week: 'nos últimos 7 dias', month: 'neste mês' };

/** Consumo (kWh) de um aparelho por hora ou por dia, na cor do aparelho. */
export function ConsumptionChart({ deviceId, color }: { deviceId: string; color: string }) {
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<ConsumptionSeries | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<ConsumptionSeries>(`/devices/${encodeURIComponent(deviceId)}/consumption?period=${period}`)
        .then((d) => alive && setData(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [deviceId, period]);

  const rows = (data?.buckets ?? []).map((b) => ({ label: b.label, kwh: b.future ? null : b.kwh, future: b.future }));
  const stale = data && data.period !== period;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Consumo"
        sub={data ? `${fmt.kwh(data.totalKwh)} · ${fmt.brl(data.totalCost)} ${PERIOD_TEXT[data.period]}` : 'Carregando…'}
        right={<Segmented value={period} options={PERIODS} onChange={setPeriod} />}
      />
      <div className={`min-h-72 flex-1 px-2 pb-3 transition-opacity ${stale ? 'opacity-50' : ''}`}>
        {data && data.totalKwh === 0 ? (
          <Empty className="h-full">Sem consumo registrado {PERIOD_TEXT[data.period]}</Empty>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
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
                content={({ active, payload }) =>
                  active && payload?.length && !payload[0].payload.future ? (
                    <TooltipBox
                      title={`${period === 'day' ? 'Das' : 'Dia'} ${payload[0].payload.label}`}
                      rows={[
                        { color, label: 'consumo', value: fmt.kwh(payload[0].payload.kwh), strong: true },
                        { label: 'custo', value: fmt.brl((payload[0].payload.kwh ?? 0) * (data?.tariff ?? 0)) },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="kwh" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

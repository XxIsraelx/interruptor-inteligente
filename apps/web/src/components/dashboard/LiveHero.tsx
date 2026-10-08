'use client';

import { Activity } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmt } from '@/lib/format';
import { useAnimatedNumber } from '@/lib/hooks';
import type { Device, LivePoint } from '@/lib/types';
import { AXIS_TICK, GRID_STROKE, TooltipBox } from '../charts/ChartTooltip';
import { BigNumber, Eyebrow, LiveDot, Skeleton } from '../ui';

const ENERGY = '#fbbf24';

export function LiveHero({ devices, total, minutes }: { devices: Device[] | null; total: LivePoint[] | null; minutes: number }) {
  const gid = useId().replace(/:/g, '');
  const online = (devices ?? []).filter((d) => d.online);
  const on = online.filter((d) => d.relayOn);
  const powerNow = on.reduce((s, d) => s + (d.power ?? 0), 0);
  const animated = useAnimatedNumber(devices ? powerNow : null);
  const [num, unit] = fmt.wattsParts(animated);
  const volts = online.map((d) => d.voltage).filter((v): v is number => v != null);
  const avgV = volts.length ? volts.reduce((s, v) => s + v, 0) / volts.length : null;

  const pts = total ?? [];
  const peak = pts.length ? Math.max(...pts.map((p) => p.p)) : null;
  const avg = pts.length ? pts.reduce((s, p) => s + p.p, 0) / pts.length : null;
  const yMax = Math.max(100, (peak ?? 0) * 1.15);

  return (
    <section className="glow-energy relative flex h-full flex-col overflow-hidden rounded-2xl border border-border">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <Eyebrow>Consumo agora</Eyebrow>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-accent">
              <LiveDot /> AO VIVO
            </span>
          </div>
          <div className="mt-2">
            {devices ? <BigNumber value={num} unit={unit} size="xl" /> : <Skeleton className="h-14 w-48" />}
          </div>
          <p className="mt-1 text-sm text-muted">
            {devices ? (
              <>
                {on.length} de {devices.length} tomadas ligadas
                {avgV != null && <> · rede em {fmt.volts(avgV)}</>}
              </>
            ) : (
              ' '
            )}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
          <dt className="text-xs text-muted">Pico ({minutes} min)</dt>
          <dt className="text-xs text-muted">Média ({minutes} min)</dt>
          <dd className="tabular text-base font-semibold">{fmt.watts(peak)}</dd>
          <dd className="tabular text-base font-semibold">{fmt.watts(avg)}</dd>
        </dl>
      </div>

      <div className="mt-2 min-h-44 flex-1 sm:min-h-52">
        {pts.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pts} margin={{ top: 10, right: 16, left: 16, bottom: 4 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ENERGY} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={ENERGY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) => fmt.time(t)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                minTickGap={60}
              />
              <YAxis
                orientation="right"
                domain={[0, yMax]}
                tickFormatter={(w) => (w >= 1000 ? `${(w / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kW` : `${Math.round(w)} W`)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={54}
                tickCount={4}
              />
              <Tooltip
                cursor={{ stroke: '#3a4757', strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={fmt.time(payload[0].payload.t)}
                      rows={[{ color: ENERGY, label: 'Casa toda', value: fmt.watts(payload[0].payload.p), strong: true }]}
                    />
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="p"
                stroke={ENERGY}
                strokeWidth={2}
                fill={`url(#${gid})`}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: ENERGY, stroke: '#0f141b', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
            <Activity className="h-4 w-4" /> Aguardando leituras…
          </div>
        )}
      </div>
    </section>
  );
}

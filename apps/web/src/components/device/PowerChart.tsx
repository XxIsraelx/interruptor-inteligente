'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useSocketEvent } from '@/lib/realtime';
import type { PowerPoint, Reading } from '@/lib/types';
import { AXIS_TICK, GRID_STROKE, TooltipBox } from '../charts/ChartTooltip';
import { Card, CardHeader, Empty, Segmented } from '../ui';

type Range = '1h' | '6h' | '24h' | '7d';
const RANGES: { value: Range; label: string }[] = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 d' },
];
const RANGE_TEXT: Record<Range, string> = {
  '1h': 'última hora, ao vivo',
  '6h': 'últimas 6 horas',
  '24h': 'últimas 24 horas',
  '7d': 'últimos 7 dias',
};

export function PowerChart({ deviceId, color }: { deviceId: string; color: string }) {
  const gid = useId().replace(/:/g, '');
  const [range, setRange] = useState<Range>('1h');
  const [data, setData] = useState<PowerPoint[] | null>(null);
  const [shownRange, setShownRange] = useState<Range>('1h');

  const load = useCallback(async () => {
    const d = await api<PowerPoint[]>(`/devices/${encodeURIComponent(deviceId)}/power?range=${range}`);
    setData(d);
    setShownRange(range);
  }, [deviceId, range]);

  useEffect(() => {
    load().catch(() => setData([]));
    const t = setInterval(() => load().catch(() => {}), range === '1h' ? 60_000 : 120_000);
    return () => clearInterval(t);
  }, [load, range]);

  // Na janela de 1 h, cada leitura nova entra no gráfico na hora
  useSocketEvent<Reading>('reading', (r) => {
    if (range !== '1h' || shownRange !== '1h' || r.deviceId !== deviceId) return;
    setData((cur) => {
      if (!cur) return cur;
      const cutoff = Date.now() - 3600_000;
      const point: PowerPoint = { bucket: r.ts, power: r.power, maxPower: r.power, voltage: r.voltage, current: r.current };
      return [...cur.filter((p) => new Date(p.bucket).getTime() >= cutoff), point];
    });
  });

  const chart = (data ?? []).map((p) => ({ t: new Date(p.bucket).getTime(), power: p.power ?? 0, max: p.maxPower ?? 0 }));
  const peak = chart.length ? Math.max(...chart.map((c) => c.max)) : 0;
  const stale = range !== shownRange;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Potência"
        sub={`Watts · ${RANGE_TEXT[range]}${chart.length ? ` · pico ${fmt.watts(peak)}` : ''}`}
        right={<Segmented value={range} options={RANGES} onChange={setRange} />}
      />
      <div className={`min-h-72 flex-1 px-2 pb-3 transition-opacity ${stale ? 'opacity-50' : ''}`}>
        {data && chart.length === 0 ? (
          <Empty className="h-full">Sem leituras nesse período</Empty>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) =>
                  shownRange === '7d'
                    ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
                    : fmt.time(t)
                }
                tick={AXIS_TICK}
                axisLine={{ stroke: '#2b3644' }}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                tickFormatter={(w: number) => (w >= 1000 ? `${(w / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `${Math.round(w)}`)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={44}
                tickCount={5}
              />
              <Tooltip
                cursor={{ stroke: '#3a4757', strokeWidth: 1 }}
                isAnimationActive={false}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={fmt.dateTime(payload[0].payload.t)}
                      rows={[{ color, label: 'potência média', value: fmt.watts(payload[0].payload.power), strong: true }]}
                    />
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="power"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gid})`}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#0f141b', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

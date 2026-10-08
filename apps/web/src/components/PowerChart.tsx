'use client';

import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useSocketEvent } from '@/lib/realtime';
import type { PowerPoint, Reading } from '@/lib/types';
import { Card, CardHeader, Empty, Segmented } from './ui';

type Range = '1h' | '6h' | '24h' | '7d';
const RANGES: { value: Range; label: string }[] = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 d' },
];

export function PowerChart({ deviceId }: { deviceId: string }) {
  const [range, setRange] = useState<Range>('1h');
  const [data, setData] = useState<PowerPoint[] | null>(null);

  const load = useCallback(async () => {
    setData(await api<PowerPoint[]>(`/devices/${encodeURIComponent(deviceId)}/power?range=${range}`));
  }, [deviceId, range]);

  useEffect(() => {
    setData(null);
    load().catch(() => setData([]));
    const t = setInterval(() => load().catch(() => {}), range === '1h' ? 60_000 : 120_000);
    return () => clearInterval(t);
  }, [load, range]);

  // Na janela de 1 h, cada leitura nova entra no gráfico na hora
  useSocketEvent<Reading>('reading', (r) => {
    if (range !== '1h' || r.deviceId !== deviceId) return;
    setData((cur) => {
      if (!cur) return cur;
      const cutoff = Date.now() - 3600_000;
      const point: PowerPoint = { bucket: r.ts, power: r.power, maxPower: r.power, voltage: r.voltage, current: r.current };
      return [...cur.filter((p) => new Date(p.bucket).getTime() >= cutoff), point];
    });
  });

  const chart = (data ?? []).map((p) => ({ t: new Date(p.bucket).getTime(), power: p.power ?? 0 }));

  return (
    <Card>
      <CardHeader title="Potência" sub="Watts · média por intervalo" right={<Segmented value={range} options={RANGES} onChange={setRange} />} />
      <div className="h-64 px-2 pb-3">
        {data && chart.length === 0 ? (
          <Empty>Sem leituras nesse período</Empty>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gPower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--power)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--power)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) =>
                  range === '7d'
                    ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : fmt.time(new Date(t).toISOString())
                }
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                stroke="var(--border)"
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(w) => (w >= 1000 ? `${(w / 1000).toFixed(1)}k` : `${Math.round(w)}`)}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                stroke="var(--border)"
                width={44}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'var(--muted)' }}
                labelFormatter={(t) => fmt.dateTime(new Date(t as number).toISOString())}
                formatter={(v) => [fmt.watts(v as number), 'Potência']}
              />
              <Area
                type="monotone"
                dataKey="power"
                stroke="var(--power)"
                strokeWidth={2}
                fill="url(#gPower)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

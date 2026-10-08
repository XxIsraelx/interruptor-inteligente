'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import type { ConsumptionSeries } from '@/lib/types';
import { Card, CardHeader, Empty, Segmented } from './ui';

type Period = 'day' | 'week' | 'month';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: '7 dias' },
  { value: 'month', label: 'Mês' },
];

/** Consumo em kWh por hora (hoje) ou por dia. deviceId vazio = casa toda. */
export function ConsumptionChart({ deviceId, title = 'Consumo' }: { deviceId?: string; title?: string }) {
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<ConsumptionSeries | null>(null);

  useEffect(() => {
    let alive = true;
    const path = deviceId ? `/devices/${encodeURIComponent(deviceId)}/consumption` : '/stats/consumption';
    const load = () =>
      api<ConsumptionSeries>(`${path}?period=${period}`)
        .then((d) => alive && setData(d))
        .catch(() => {});
    setData(null);
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [deviceId, period]);

  const chart = (data?.buckets ?? []).map((b) => {
    const d = new Date(b.bucket);
    return {
      label:
        period === 'day'
          ? `${String(d.getHours()).padStart(2, '0')}h`
          : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      kwh: b.kwh,
    };
  });

  return (
    <Card>
      <CardHeader
        title={title}
        sub={data ? `${fmt.kwh(data.totalKwh)} · ${fmt.brl(data.totalCost)} (tarifa ${fmt.brl(data.tariff)}/kWh)` : 'Carregando...'}
        right={<Segmented value={period} options={PERIODS} onChange={setPeriod} />}
      />
      <div className="h-64 px-2 pb-3">
        {data && chart.length === 0 ? (
          <Empty>Sem consumo registrado nesse período</Empty>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" minTickGap={8} />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                stroke="var(--border)"
                width={40}
                tickFormatter={(v: number) =>
                  v.toLocaleString('pt-BR', { maximumFractionDigits: v === 0 ? 0 : v < 0.1 ? 3 : v < 1 ? 2 : 1 })
                }
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'var(--muted)' }}
                formatter={(v) => [`${fmt.kwh(v as number)} · ${fmt.brl((v as number) * (data?.tariff ?? 0))}`, 'Consumo']}
              />
              <Bar dataKey="kwh" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

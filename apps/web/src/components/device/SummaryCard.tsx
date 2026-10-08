'use client';

import { CalendarDays, Clock, Flame, Gauge, ShieldCheck, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { fmt } from '@/lib/format';
import { useDeviceSummary } from '@/lib/hooks';
import type { Device } from '@/lib/types';
import { Card, CardHeader, Skeleton } from '../ui';

function Row({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">{icon}</span>
      <span className="min-w-0 flex-1 text-sm text-text-2">{label}</span>
      <span className="text-right">
        <span className="tabular block text-sm font-semibold">{value}</span>
        {sub && <span className="tabular block text-xs text-muted">{sub}</span>}
      </span>
    </div>
  );
}

/** Resumo do aparelho: hoje, mês, previsão, pico, tempo ligado e proteção. */
export function SummaryCard({ device }: { device: Device }) {
  const s = useDeviceSummary(device.id);
  if (!s)
    return (
      <Card className="h-full p-5">
        <Skeleton className="mb-4 h-5 w-24" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="mb-3 h-10" />
        ))}
      </Card>
    );
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Resumo" sub={`Tarifa ${fmt.brl(s.tariff)}/kWh`} />
      <div className="divide-y divide-border px-5 pb-2">
        <Row icon={<Clock className="h-4 w-4" />} label="Hoje" value={fmt.kwh(s.kwhToday)} sub={fmt.brl(s.costToday)} />
        <Row icon={<CalendarDays className="h-4 w-4" />} label="Este mês" value={fmt.kwh(s.kwhMonth)} sub={fmt.brl(s.costMonth)} />
        <Row
          icon={<TrendingUp className="h-4 w-4" />}
          label="Previsão do mês"
          value={s.projectedCost != null ? fmt.brl(s.projectedCost) : 'calculando…'}
          sub={s.avgDailyKwh != null ? `média ${fmt.kwh(s.avgDailyKwh)}/dia` : undefined}
        />
        <Row
          icon={<Flame className="h-4 w-4" />}
          label="Pico hoje"
          value={fmt.watts(s.peakTodayW)}
          sub={s.peakTodayAt ? `às ${fmt.time(s.peakTodayAt)}` : undefined}
        />
        <Row icon={<Gauge className="h-4 w-4" />} label="Tempo em uso hoje" value={fmt.duration(s.onSecondsToday)} />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Proteção"
          value={device.maxPowerW ? `acima de ${fmt.watts(device.maxPowerW)}` : 'sem limite'}
          sub={device.maxPowerW ? 'desliga sozinho' : undefined}
        />
      </div>
    </Card>
  );
}

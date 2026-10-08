'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { fmt } from '@/lib/format';
import type { ConsumptionBucket, Overview } from '@/lib/types';
import { TooltipBox } from '../charts/ChartTooltip';
import { BigNumber, Eyebrow, Skeleton } from '../ui';

/** Consumo de hoje + barrinhas por hora (hora atual em destaque). */
export function TodayCard({ overview, hours }: { overview: Overview | null; hours: ConsumptionBucket[] | null }) {
  const current = hours ? hours.findIndex((h) => h.future) - 1 : -1;
  const curIdx = current >= 0 ? current : (hours?.length ?? 0) - 1;
  const data = (hours ?? []).map((h, i) => ({ ...h, value: h.future ? 0 : h.kwh, i }));
  const [n, unit] = overview ? [fmt.kwhNum(overview.kwhToday), 'kWh'] : ['—', ''];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
      <Eyebrow>Hoje</Eyebrow>
      <div className="mt-2">{overview ? <BigNumber value={n} unit={unit} /> : <Skeleton className="h-10 w-32" />}</div>
      <p className="mt-1 text-sm text-muted">
        {overview ? (
          <>
            <span className="font-medium text-text-2">{fmt.brl(overview.costToday)}</span>
            {overview.avgDailyKwh != null && <> · média {fmt.kwh(overview.avgDailyKwh)}/dia</>}
          </>
        ) : (
          ' '
        )}
      </p>
      <div className="mt-auto flex min-h-0 flex-1 flex-col pt-5">
        <div className="min-h-16 flex-1">
          {hours && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
                <XAxis dataKey="label" hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  isAnimationActive={false}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipBox
                        title={`${payload[0].payload.label} – ${String((payload[0].payload.i + 1) % 24).padStart(2, '0')}h`}
                        rows={[
                          {
                            label: 'consumo',
                            value: payload[0].payload.future ? '—' : fmt.kwh(payload[0].payload.kwh),
                            strong: true,
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false} minPointSize={2}>
                  {data.map((d) => (
                    <Cell key={d.i} fill={d.i === curIdx ? '#34d399' : d.future ? '#151b24' : '#2b3644'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>
      </div>
    </section>
  );
}

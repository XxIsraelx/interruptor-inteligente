'use client';

import { Receipt } from 'lucide-react';
import { fmt } from '@/lib/format';
import type { Overview } from '@/lib/types';
import { BigNumber, Eyebrow, Skeleton } from '../ui';

/** Conta de luz do mês: gasto até agora + previsão no ritmo dos últimos 7 dias. */
export function BillCard({ overview }: { overview: Overview | null }) {
  const o = overview;
  const spent = o ? fmt.brl(o.costMonth).replace(/^R\$\s?/, '') : '—';
  const ratio = o?.projectedCost ? Math.min(1, o.costMonth / o.projectedCost) : 0;

  return (
    <section className="glow-accent flex h-full flex-col rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between">
        <Eyebrow>Conta de luz · {fmt.monthName()}</Eyebrow>
        <Receipt className="h-4 w-4 text-muted" />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        {o ? (
          <>
            <span className="text-lg font-medium text-muted">R$</span>
            <BigNumber value={spent} />
          </>
        ) : (
          <Skeleton className="h-10 w-36" />
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{o ? `${fmt.kwh(o.kwhMonth)} até agora` : ' '}</p>

      {o && (
        <dl className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
            <dt className="text-[11px] text-muted">Média por dia</dt>
            <dd className="mt-0.5 font-semibold">{o.avgDailyKwh != null ? fmt.brl(o.avgDailyKwh * o.tariff) : '—'}</dd>
            <dd className="text-[11px] text-muted">{o.avgDailyKwh != null ? fmt.kwh(o.avgDailyKwh) : 'coletando'}</dd>
          </div>
          <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
            <dt className="text-[11px] text-muted">Faltam</dt>
            <dd className="mt-0.5 font-semibold">
              {o.daysInMonth - o.dayOfMonth} {o.daysInMonth - o.dayOfMonth === 1 ? 'dia' : 'dias'}
            </dd>
            <dd className="text-[11px] text-muted">neste mês</dd>
          </div>
        </dl>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted">Previsão do mês</span>
          <span className="text-lg font-semibold tracking-tight">
            {o?.projectedCost != null ? fmt.brl(o.projectedCost) : 'calculando…'}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-label="Parte da conta prevista que já foi gasta"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${ratio * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>{o ? `Dia ${o.dayOfMonth} de ${o.daysInMonth}` : ' '}</span>
          <span>{o ? `tarifa ${fmt.brl(o.tariff)}/kWh` : ' '}</span>
        </div>
      </div>
    </section>
  );
}

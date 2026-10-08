'use client';

import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Schedule } from '@/lib/types';
import { Card, CardHeader, Empty } from '../ui';

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function describeDays(days: number[]) {
  const s = [...days].sort();
  if (s.length === 7) return 'Todos os dias';
  if (s.join() === '1,2,3,4,5') return 'Dias úteis';
  if (s.join() === '0,6') return 'Fim de semana';
  return s.map((d) => DAY_NAMES[d]).join(', ');
}

export function SchedulesCard({ deviceId }: { deviceId: string }) {
  const [items, setItems] = useState<Schedule[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState<'ON' | 'OFF'>('OFF');
  const [time, setTime] = useState('22:00');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [error, setError] = useState<string | null>(null);

  const base = `/devices/${encodeURIComponent(deviceId)}/schedules`;
  const load = useCallback(() => api<Schedule[]>(base).then(setItems).catch(() => setItems([])), [base]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setError(null);
    try {
      await api(base, { method: 'POST', json: { action, time, daysOfWeek: days } });
      setAdding(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggle(s: Schedule) {
    setItems((cur) => cur?.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)) ?? cur);
    await api(`/schedules/${s.id}`, { method: 'PATCH', json: { enabled: !s.enabled } }).catch(() => load());
  }

  async function remove(s: Schedule) {
    setItems((cur) => cur?.filter((x) => x.id !== s.id) ?? cur);
    await api(`/schedules/${s.id}`, { method: 'DELETE' }).catch(() => load());
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Agendamentos"
        sub="Liga e desliga sozinho no horário"
        icon={<CalendarClock className="h-4 w-4" />}
        right={
          !adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium transition hover:border-border-strong"
            >
              <Plus className="h-3.5 w-3.5" /> Novo
            </button>
          )
        }
      />

      {adding && (
        <div className="mx-5 mb-4 space-y-3 rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(['ON', 'OFF'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${action === a ? 'bg-surface-3 text-text' : 'text-muted'}`}
                >
                  {a === 'ON' ? 'Ligar' : 'Desligar'}
                </button>
              ))}
            </div>
            <span className="text-sm text-muted">às</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text [color-scheme:dark]"
            />
          </div>
          <div className="flex gap-1.5">
            {DAYS.map((d, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={i}
                  title={DAY_NAMES[i]}
                  aria-pressed={on}
                  onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                  className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
                    on ? 'bg-accent text-slate-950' : 'border border-border bg-surface text-muted'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-text">
              Cancelar
            </button>
            <button
              onClick={create}
              disabled={days.length === 0}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {items && items.length === 0 && !adding && <Empty>Nenhum agendamento</Empty>}
      <ul className="divide-y divide-border px-5 pb-3">
        {items?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-3">
            <div className={`flex items-center gap-3 ${s.enabled ? '' : 'opacity-50'}`}>
              <span
                className={`tabular rounded-lg px-2.5 py-1 text-sm font-semibold ${
                  s.action === 'ON' ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-text-2'
                }`}
              >
                {s.time}
              </span>
              <div>
                <p className="text-sm font-medium">{s.action === 'ON' ? 'Ligar' : 'Desligar'}</p>
                <p className="text-xs text-muted">{describeDays(s.daysOfWeek)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle(s)}
                role="switch"
                aria-checked={s.enabled}
                aria-label="Ativar agendamento"
                className={`relative h-6 w-10 rounded-full transition ${s.enabled ? 'bg-accent' : 'bg-surface-3'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`}
                />
              </button>
              <button onClick={() => remove(s)} className="rounded-lg p-2 text-muted transition hover:text-red-300" aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Schedule } from '@/lib/types';
import { Card, CardHeader, Empty } from './ui';

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function describeDays(days: number[]) {
  const s = [...days].sort();
  if (s.length === 7) return 'Todos os dias';
  if (s.join() === '1,2,3,4,5') return 'Dias úteis';
  if (s.join() === '0,6') return 'Fim de semana';
  return s.map((d) => DAY_NAMES[d]).join(', ');
}

export function SchedulesPanel({ deviceId }: { deviceId: string }) {
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
    await api(`/schedules/${s.id}`, { method: 'PATCH', json: { enabled: !s.enabled } });
    load();
  }

  async function remove(s: Schedule) {
    await api(`/schedules/${s.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Card>
      <CardHeader
        title="Agendamentos"
        sub="Liga ou desliga automaticamente"
        right={
          !adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium hover:bg-border"
            >
              <Plus className="h-3.5 w-3.5" /> Novo
            </button>
          )
        }
      />

      {adding && (
        <div className="mx-5 mb-4 space-y-3 rounded-xl bg-surface-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as 'ON' | 'OFF')}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            >
              <option value="ON">Ligar</option>
              <option value="OFF">Desligar</option>
            </select>
            <span className="text-sm text-muted">às</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {DAYS.map((d, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={i}
                  title={DAY_NAMES[i]}
                  onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                  className={`h-8 w-8 rounded-full text-xs font-semibold ${
                    on ? 'bg-accent text-white dark:text-black' : 'bg-surface text-muted'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-text">
              Cancelar
            </button>
            <button
              onClick={create}
              disabled={days.length === 0}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 dark:text-black"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {items && items.length === 0 && !adding && <Empty>Nenhum agendamento</Empty>}
      <ul className="px-5 pb-3">
        {items?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
            <div className={s.enabled ? '' : 'opacity-50'}>
              <p className="tabular text-sm font-semibold">
                {s.time} · {s.action === 'ON' ? 'Ligar' : 'Desligar'}
              </p>
              <p className="text-xs text-muted">{describeDays(s.daysOfWeek)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggle(s)}
                role="switch"
                aria-checked={s.enabled}
                aria-label="Ativar agendamento"
                className={`relative h-6 w-10 rounded-full transition ${s.enabled ? 'bg-accent' : 'bg-border'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`}
                />
              </button>
              <button onClick={() => remove(s)} className="rounded-lg p-2 text-muted hover:text-danger" aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

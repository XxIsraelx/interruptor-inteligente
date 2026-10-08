'use client';

import { Power } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Device } from '@/lib/types';
import { Spinner } from './ui';

/**
 * Chave liga/desliga. O estado só muda na tela quando o ESP32 confirma
 * (chega device:update com o novo relayOn), não no clique.
 */
export function RelaySwitch({
  device,
  size = 'md',
  showLabel = false,
}: {
  device: Device;
  size?: 'md' | 'lg';
  showLabel?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const before = useRef(device.relayOn);

  useEffect(() => {
    if (pending && device.relayOn !== before.current) {
      setPending(false);
      if (timer.current) clearTimeout(timer.current);
    }
  }, [device.relayOn, pending]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    before.current = device.relayOn;
    setPending(true);
    try {
      await api(`/devices/${encodeURIComponent(device.id)}/relay`, {
        method: 'POST',
        json: { state: device.relayOn ? 'OFF' : 'ON' },
      });
      timer.current = setTimeout(() => {
        setPending(false);
        setError('Sem confirmação do dispositivo');
      }, 8000);
    } catch (err) {
      setPending(false);
      setError((err as Error).message);
    }
  }

  const on = device.relayOn;
  const disabled = !device.online || pending;
  const lg = size === 'lg';
  const track = lg ? 'h-9 w-[68px]' : 'h-7 w-[52px]';
  const knob = lg ? 'h-7 w-7' : 'h-[22px] w-[22px]';
  const travel = lg ? 'translate-x-[32px]' : 'translate-x-[24px]';

  return (
    <div className="relative z-10 flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {showLabel && (
          <span className={`text-sm font-medium ${on ? 'text-text' : 'text-muted'}`}>
            {pending ? (on ? 'Desligando…' : 'Ligando…') : on ? 'Ligado' : 'Desligado'}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={on ? `Desligar ${device.name}` : `Ligar ${device.name}`}
          title={!device.online ? 'Dispositivo offline' : on ? 'Desligar' : 'Ligar'}
          onClick={toggle}
          disabled={disabled}
          className={`relative inline-flex shrink-0 items-center rounded-full border p-[3px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed ${track} ${
            on
              ? 'border-accent/40 bg-accent shadow-[0_0_18px_rgba(52,211,153,0.35)]'
              : 'border-border-strong bg-surface-3'
          } ${!device.online ? 'opacity-40' : ''}`}
        >
          <span
            className={`grid place-items-center rounded-full bg-white shadow-md transition-transform duration-200 ${knob} ${
              on ? travel : 'translate-x-0'
            }`}
          >
            {pending ? (
              <Spinner className={`${lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} text-slate-500`} />
            ) : (
              <Power className={`${lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} ${on ? 'text-emerald-600' : 'text-slate-400'}`} />
            )}
          </span>
        </button>
      </div>
      {error && <span className="max-w-[180px] text-right text-[11px] text-red-300">{error}</span>}
    </div>
  );
}

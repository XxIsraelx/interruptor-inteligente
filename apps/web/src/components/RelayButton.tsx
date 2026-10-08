'use client';

import { Power } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Device } from '@/lib/types';
import { Spinner } from './ui';

/**
 * Liga/desliga. O estado só muda na tela quando o ESP32 confirma
 * (chega device:update com o novo relayOn), não no clique.
 */
export function RelayButton({ device, size = 'md' }: { device: Device; size?: 'md' | 'lg' }) {
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

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function toggle() {
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
        setError('O dispositivo não confirmou');
      }, 8000);
    } catch (e) {
      setPending(false);
      setError((e as Error).message);
    }
  }

  const on = device.relayOn;
  const disabled = !device.online || pending;
  const big = size === 'lg';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={disabled}
        aria-pressed={on}
        aria-label={on ? 'Desligar' : 'Ligar'}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
          big ? 'h-12 px-6 text-base' : 'h-9 px-3.5 text-sm'
        } ${on ? 'bg-accent text-white dark:text-black' : 'bg-surface-2 text-text hover:bg-border'}`}
      >
        {pending ? <Spinner /> : <Power className={big ? 'h-5 w-5' : 'h-4 w-4'} />}
        {on ? 'Ligado' : 'Desligado'}
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}

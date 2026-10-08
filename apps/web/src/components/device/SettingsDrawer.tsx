'use client';

import { RotateCcw, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Device } from '@/lib/types';
import { DeviceIcon, ICONS } from '../DeviceIcon';
import { Spinner } from '../ui';

const input =
  'mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent/60';

/** Configurações do aparelho em gaveta lateral (nome, cômodo, ícone, proteção, ações). */
export function SettingsDrawer({
  device,
  open,
  onClose,
  onSaved,
}: {
  device: Device;
  open: boolean;
  onClose: () => void;
  onSaved: (d: Device) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(device.name);
  const [location, setLocation] = useState(device.location ?? '');
  const [icon, setIcon] = useState(device.icon);
  const [maxPower, setMaxPower] = useState(device.maxPowerW?.toString() ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(device.name);
    setLocation(device.location ?? '');
    setIcon(device.icon);
    setMaxPower(device.maxPowerW?.toString() ?? '');
    setMsg(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<Device>(`/devices/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        json: { name: name.trim() || device.name, location: location.trim(), icon, maxPowerW: maxPower ? Number(maxPower) : null },
      });
      onSaved(d);
      onClose();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function resetEnergy() {
    if (!confirm('Zerar o contador de energia do sensor? O histórico já salvo não é apagado.')) return;
    try {
      await api(`/devices/${encodeURIComponent(device.id)}/energy/reset`, { method: 'POST' });
      setMsg({ ok: true, text: 'Comando enviado ao sensor' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  async function remove() {
    if (!confirm(`Remover "${device.name}" e todo o histórico?`)) return;
    await api(`/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
    router.replace('/');
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Configurações do dispositivo">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-sidebar shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Configurações</h2>
            <p className="text-xs text-muted">{device.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <label className="block text-xs font-medium text-muted">
            Nome
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <label className="block text-xs font-medium text-muted">
            Cômodo / local
            <input className={input} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={60} placeholder="Ex.: Quarto" />
          </label>

          <fieldset>
            <legend className="text-xs font-medium text-muted">Ícone</legend>
            <div className="mt-1.5 grid grid-cols-6 gap-2">
              {Object.entries(ICONS).map(([key, v]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  title={v.label}
                  aria-pressed={icon === key}
                  className={`grid aspect-square place-items-center rounded-lg border transition ${
                    icon === key ? 'border-accent/60 bg-accent-soft text-accent' : 'border-border bg-surface-2 text-text-2 hover:border-border-strong'
                  }`}
                >
                  <DeviceIcon name={key} />
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs font-medium text-muted">
            Proteção: desligar sozinho acima de (W)
            <input
              className={input}
              type="number"
              min={1}
              max={10000}
              placeholder="Sem limite"
              value={maxPower}
              onChange={(e) => setMaxPower(e.target.value)}
            />
            <span className="mt-1.5 block font-normal text-muted">Se a potência passar disso, o relé é desligado e fica registrado na linha do tempo.</span>
          </label>

          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted">Ações</p>
            <button
              onClick={resetEnergy}
              disabled={!device.online}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-2 transition hover:bg-surface-2 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" /> Zerar contador do sensor
            </button>
            <button
              onClick={remove}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-critical-soft"
            >
              <Trash2 className="h-4 w-4" /> Remover dispositivo
            </button>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? 'text-accent' : 'text-red-300'}`}>{msg.text}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-text">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving && <Spinner className="h-3.5 w-3.5" />} Salvar
          </button>
        </footer>
      </aside>
    </div>
  );
}

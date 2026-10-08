'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { Device } from '@/lib/types';
import { ICONS } from './DeviceIcon';
import { Card, CardHeader } from './ui';

export function DeviceSettings({ device, onSaved }: { device: Device; onSaved: (d: Device) => void }) {
  const router = useRouter();
  const [name, setName] = useState(device.name);
  const [location, setLocation] = useState(device.location ?? '');
  const [icon, setIcon] = useState(device.icon);
  const [maxPower, setMaxPower] = useState(device.maxPowerW?.toString() ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const d = await api<Device>(`/devices/${encodeURIComponent(device.id)}`, {
        method: 'PATCH',
        json: { name: name.trim() || device.name, location: location.trim(), icon, maxPowerW: maxPower ? Number(maxPower) : null },
      });
      onSaved(d);
      setMsg({ ok: true, text: 'Salvo' });
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
      setMsg({ ok: true, text: 'Comando enviado' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  async function remove() {
    if (!confirm(`Remover "${device.name}" e todo o histórico?`)) return;
    await api(`/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
    router.replace('/');
  }

  const input = 'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <Card>
      <CardHeader title="Configurações" sub={`ID ${device.id}${device.firmware ? ` · firmware ${device.firmware}` : ''}`} />
      <div className="space-y-3 px-5 pb-5">
        <label className="block text-xs text-muted">
          Nome
          <input className={`${input} mt-1 text-text`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <label className="block text-xs text-muted">
          Cômodo / local
          <input className={`${input} mt-1 text-text`} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={60} />
        </label>
        <label className="block text-xs text-muted">
          Ícone
          <select className={`${input} mt-1 text-text`} value={icon} onChange={(e) => setIcon(e.target.value)}>
            {Object.entries(ICONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Desligar automaticamente acima de (W)
          <input
            className={`${input} mt-1 text-text`}
            type="number"
            min={1}
            max={10000}
            placeholder="Sem limite"
            value={maxPower}
            onChange={(e) => setMaxPower(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className={`text-xs ${msg?.ok ? 'text-accent' : 'text-danger'}`}>{msg?.text}</span>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:text-black"
          >
            Salvar
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <button onClick={resetEnergy} disabled={!device.online} className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium hover:bg-border disabled:opacity-50">
            Zerar contador do sensor
          </button>
          <button onClick={remove} className="rounded-lg bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger">
            Remover dispositivo
          </button>
        </div>
      </div>
    </Card>
  );
}

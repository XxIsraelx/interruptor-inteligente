'use client';

import { Cpu } from 'lucide-react';
import type { ReactNode } from 'react';
import { fmt } from '@/lib/format';
import type { Device } from '@/lib/types';
import { Card, CardHeader } from '../ui';

function signal(rssi: number | null) {
  if (rssi == null) return { bars: 0, label: '—' };
  if (rssi >= -55) return { bars: 4, label: 'ótimo' };
  if (rssi >= -67) return { bars: 3, label: 'bom' };
  if (rssi >= -75) return { bars: 2, label: 'fraco' };
  return { bars: 1, label: 'ruim' };
}

function Bars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-end gap-[2px]" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`w-[3px] rounded-sm ${i <= n ? 'bg-text-2' : 'bg-surface-3'}`} style={{ height: 3 + i * 3 }} />
      ))}
    </span>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-text-2">{children}</dd>
    </div>
  );
}

/** Dados técnicos do ESP32 (útil para a apresentação e para depurar). */
export function InfoCard({ device }: { device: Device }) {
  const s = signal(device.online ? device.rssi : null);
  return (
    <Card className="h-full">
      <CardHeader title="Dispositivo" sub="ESP32 + PZEM-004T + relé" icon={<Cpu className="h-4 w-4" />} />
      <dl className="divide-y divide-border px-5 pb-3">
        <Item label="ID">
          <code className="font-mono text-xs">{device.id}</code>
        </Item>
        <Item label="Tópico MQTT">
          <code className="font-mono text-xs">interruptor/{device.id}/…</code>
        </Item>
        <Item label="Sinal Wi-Fi">
          <span className="inline-flex items-center gap-2">
            <Bars n={s.bars} />
            {device.online && device.rssi != null ? `${device.rssi} dBm · ${s.label}` : '—'}
          </span>
        </Item>
        <Item label="Firmware">{device.firmware ?? '—'}</Item>
        <Item label="Última leitura">
          <span title={device.lastSeenAt ? fmt.dateTime(device.lastSeenAt) : undefined}>{fmt.ago(device.lastSeenAt)}</span>
        </Item>
        <Item label="Cadastrado em">{fmt.dateTime(device.createdAt)}</Item>
      </dl>
    </Card>
  );
}

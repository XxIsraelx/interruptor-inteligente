'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { fmt } from '@/lib/format';
import type { Device } from '@/lib/types';
import { DeviceIcon } from './DeviceIcon';
import { RelayButton } from './RelayButton';
import { Card, StatusPill } from './ui';

export function DeviceCard({ device }: { device: Device }) {
  const active = device.online && device.relayOn;
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <Link href={`/device?id=${encodeURIComponent(device.id)}`} className="group flex min-w-0 items-center gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              active ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'
            }`}
          >
            <DeviceIcon name={device.icon} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 truncate font-semibold group-hover:underline">
              {device.name}
              <ChevronRight className="h-4 w-4 text-muted" />
            </span>
            <span className="block truncate text-xs text-muted">{device.location || device.id}</span>
          </span>
        </Link>
        <StatusPill online={device.online} />
      </div>

      <div className="px-5">
        <p className={`tabular text-3xl font-bold tracking-tight ${active ? 'text-power' : 'text-muted'}`}>
          {device.online ? fmt.watts(device.relayOn ? device.power : 0) : '—'}
        </p>
        <p className="tabular mt-0.5 text-xs text-muted">
          {fmt.volts(device.voltage)} · {fmt.amps(device.relayOn ? device.current : 0)}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border px-5 py-3">
        <div className="tabular text-xs">
          <p className="text-muted">Hoje</p>
          <p className="font-semibold">
            {fmt.kwh(device.kwhToday ?? 0)} <span className="font-normal text-muted">· {fmt.brl(device.costToday ?? 0)}</span>
          </p>
        </div>
        <RelayButton device={device} />
      </div>
    </Card>
  );
}

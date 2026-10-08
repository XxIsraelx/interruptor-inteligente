'use client';

import {
  CalendarClock,
  Power,
  PowerOff,
  RotateCcw,
  Send,
  ShieldAlert,
  Wifi,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { fmt } from '@/lib/format';
import type { DeviceEvent, EventType } from '@/lib/types';

// Cores de status só onde há estado (online/offline/proteção); o resto fica neutro.
const STYLE: Record<EventType, { icon: LucideIcon; cls: string }> = {
  RELAY_ON: { icon: Power, cls: 'bg-accent-soft text-accent' },
  RELAY_OFF: { icon: PowerOff, cls: 'bg-surface-3 text-text-2' },
  COMMAND: { icon: Send, cls: 'bg-surface-3 text-muted' },
  ONLINE: { icon: Wifi, cls: 'bg-good/15 text-green-300' },
  OFFLINE: { icon: WifiOff, cls: 'bg-critical-soft text-red-300' },
  SCHEDULE: { icon: CalendarClock, cls: 'bg-surface-3 text-text-2' },
  RULE: { icon: ShieldAlert, cls: 'bg-critical-soft text-red-300' },
  ENERGY_RESET: { icon: RotateCcw, cls: 'bg-surface-3 text-muted' },
};

export function EventItem({
  event,
  deviceName,
  deviceColor,
}: {
  event: DeviceEvent & { fresh?: boolean };
  deviceName?: string;
  deviceColor?: string;
}) {
  const s = STYLE[event.type] ?? STYLE.COMMAND;
  const Icon = s.icon;
  return (
    <li className={`flex gap-3 py-2.5 ${event.fresh ? 'fade-in-down' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${s.cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">{event.message}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {deviceName && (
            <>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: deviceColor }} />
              <span className="truncate">{deviceName}</span>
              <span>·</span>
            </>
          )}
          <time dateTime={event.ts} title={fmt.dateTime(event.ts)} className="shrink-0">
            {fmt.ago(event.ts)}
          </time>
        </p>
      </div>
    </li>
  );
}

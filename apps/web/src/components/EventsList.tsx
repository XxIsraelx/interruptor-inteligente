'use client';

import { CalendarClock, Power, PowerOff, RotateCcw, Send, ShieldAlert, Wifi, WifiOff, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useSocketEvent } from '@/lib/realtime';
import type { DeviceEvent, EventType } from '@/lib/types';
import { Card, CardHeader, Empty } from './ui';

const STYLE: Record<EventType, { icon: LucideIcon; color: string }> = {
  RELAY_ON: { icon: Power, color: 'text-accent' },
  RELAY_OFF: { icon: PowerOff, color: 'text-muted' },
  COMMAND: { icon: Send, color: 'text-muted' },
  ONLINE: { icon: Wifi, color: 'text-accent' },
  OFFLINE: { icon: WifiOff, color: 'text-danger' },
  SCHEDULE: { icon: CalendarClock, color: 'text-power' },
  RULE: { icon: ShieldAlert, color: 'text-danger' },
  ENERGY_RESET: { icon: RotateCcw, color: 'text-muted' },
};

export function EventsList({ deviceId }: { deviceId: string }) {
  const [events, setEvents] = useState<DeviceEvent[] | null>(null);

  useEffect(() => {
    api<DeviceEvent[]>(`/devices/${encodeURIComponent(deviceId)}/events?limit=30`)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [deviceId]);

  useSocketEvent<DeviceEvent>('event', (ev) => {
    if (ev.deviceId === deviceId) setEvents((cur) => [ev, ...(cur ?? [])].slice(0, 30));
  });

  return (
    <Card>
      <CardHeader title="Linha do tempo" />
      {events && events.length === 0 && <Empty>Nenhum evento ainda</Empty>}
      <ol className="max-h-96 overflow-y-auto px-5 pb-4">
        {events?.map((ev) => {
          const s = STYLE[ev.type] ?? STYLE.COMMAND;
          const Icon = s.icon;
          return (
            <li key={ev.id} className="flex gap-3 border-b border-border py-2.5 last:border-0">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{ev.message}</p>
                <p className="tabular text-xs text-muted">{fmt.dateTime(ev.ts)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

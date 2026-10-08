'use client';

import { History } from 'lucide-react';
import { useEvents, useTick } from '@/lib/hooks';
import type { Device } from '@/lib/types';
import { EventItem } from '../EventItem';
import { Card, CardHeader, Empty } from '../ui';

/** Linha do tempo da casa toda: o que ligou, desligou, ficou offline, automações. */
export function ActivityFeed({ devices, colors }: { devices: Device[] | null; colors: Record<string, string> }) {
  const events = useEvents(undefined, 40);
  useTick(15_000);
  const names = Object.fromEntries((devices ?? []).map((d) => [d.id, d.name]));

  return (
    <Card className="flex h-full max-h-[34rem] flex-col xl:max-h-none">
      <CardHeader title="Atividade da casa" sub="Atualiza sozinha" icon={<History className="h-4 w-4" />} />
      {events && events.length === 0 && <Empty>Nada por aqui ainda</Empty>}
      <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-5 pb-3 xl:h-0">
        {events?.map((ev) => (
          <EventItem key={ev.id} event={ev} deviceName={names[ev.deviceId] ?? ev.deviceId} deviceColor={colors[ev.deviceId]} />
        ))}
      </ol>
    </Card>
  );
}

'use client';

import { History } from 'lucide-react';
import { useEvents, useTick } from '@/lib/hooks';
import { EventItem } from '../EventItem';
import { Card, CardHeader, Empty } from '../ui';

export function Timeline({ deviceId }: { deviceId: string }) {
  const events = useEvents(deviceId, 30);
  useTick(15_000);
  return (
    <Card className="flex h-full max-h-[30rem] flex-col xl:max-h-none">
      <CardHeader title="Linha do tempo" icon={<History className="h-4 w-4" />} />
      {events && events.length === 0 && <Empty>Nenhum evento ainda</Empty>}
      <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto px-5 pb-3 xl:h-0">
        {events?.map((ev) => <EventItem key={ev.id} event={ev} />)}
      </ol>
    </Card>
  );
}

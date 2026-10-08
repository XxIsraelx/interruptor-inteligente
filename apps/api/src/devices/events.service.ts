import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';
import { events, EventType } from '../db/schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export type EventSource = 'device' | 'app' | 'schedule' | 'rule' | 'system';

/** Linha do tempo do dispositivo (ligou, desligou, offline...). */
@Injectable()
export class EventsService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly rt: RealtimeGateway,
  ) {}

  async log(deviceId: string, type: EventType, source: EventSource, message: string) {
    const [ev] = await this.db.insert(events).values({ deviceId, type, source, message }).returning();
    this.rt.emit('event', ev);
    return ev;
  }

  list(deviceId: string, limit = 50) {
    return this.db
      .select()
      .from(events)
      .where(eq(events.deviceId, deviceId))
      .orderBy(desc(events.ts), desc(events.id))
      .limit(Math.min(limit, 500));
  }
}

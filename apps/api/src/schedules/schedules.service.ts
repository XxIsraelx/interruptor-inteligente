import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, arrayContains, asc, eq } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';
import { schedules } from '../db/schema';
import { DevicesService } from '../devices/devices.service';
import { EventsService } from '../devices/events.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto';

/** Hora local (HH:mm) e dia da semana (0=dom) no fuso configurado. */
function localNow(tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { hhmm: `${get('hour')}:${get('minute')}`, dow: days.indexOf(get('weekday')) };
}

@Injectable()
export class SchedulesService {
  private readonly log = new Logger(SchedulesService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly devices: DevicesService,
    private readonly events: EventsService,
  ) {}

  list(deviceId: string) {
    return this.db.select().from(schedules).where(eq(schedules.deviceId, deviceId)).orderBy(asc(schedules.time));
  }

  async create(deviceId: string, dto: CreateScheduleDto) {
    await this.devices.get(deviceId);
    const [s] = await this.db.insert(schedules).values({ deviceId, ...dto }).returning();
    return s;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    await this.find(id);
    const [s] = await this.db.update(schedules).set(dto).where(eq(schedules.id, id)).returning();
    return s;
  }

  async remove(id: string) {
    await this.find(id);
    await this.db.delete(schedules).where(eq(schedules.id, id));
    return { ok: true };
  }

  private async find(id: string) {
    const [s] = await this.db.select().from(schedules).where(eq(schedules.id, id));
    if (!s) throw new NotFoundException('Agendamento não encontrado');
    return s;
  }

  /** Roda a cada minuto e executa os agendamentos do horário atual. */
  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const { hhmm, dow } = localNow(process.env.TZ || 'America/Sao_Paulo');
    const due = await this.db
      .select()
      .from(schedules)
      .where(and(eq(schedules.enabled, true), eq(schedules.time, hhmm), arrayContains(schedules.daysOfWeek, [dow])));
    for (const s of due) {
      // Evita rodar duas vezes no mesmo minuto (ex.: reinício da API)
      if (s.lastRunAt && Date.now() - s.lastRunAt.getTime() < 60_000) continue;
      await this.db.update(schedules).set({ lastRunAt: new Date() }).where(eq(schedules.id, s.id));
      try {
        await this.devices.sendRelay(s.deviceId, s.action, 'schedule');
        await this.events.log(s.deviceId, 'SCHEDULE', 'schedule', `Agendamento das ${s.time}: ${s.action === 'ON' ? 'ligar' : 'desligar'}`);
      } catch (e) {
        const msg = (e as Error).message;
        this.log.warn(`Agendamento ${s.id} falhou: ${msg}`);
        await this.events.log(s.deviceId, 'SCHEDULE', 'schedule', `Agendamento das ${s.time} não executado: ${msg}`);
      }
    }
  }
}

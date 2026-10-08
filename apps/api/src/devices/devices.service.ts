import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';
import { devices } from '../db/schema';
import { MqttService } from '../mqtt/mqtt.service';
import { ConsumptionService } from './consumption.service';
import { EventsService, EventSource } from './events.service';
import { UpdateDeviceDto } from './dto';

export type RelayCommand = 'ON' | 'OFF' | 'TOGGLE';

export const tariff = () => Number(process.env.TARIFF_KWH ?? 0.92);

@Injectable()
export class DevicesService {
  /** Quem pediu a última troca do relé (para registrar a origem quando o ESP32 confirmar). */
  private pending = new Map<string, { source: EventSource; at: number }>();

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly mqtt: MqttService,
    private readonly events: EventsService,
    private readonly consumption: ConsumptionService,
  ) {}

  async list() {
    const [rows, today, month] = await Promise.all([
      this.db.select().from(devices).orderBy(asc(devices.createdAt)),
      this.consumption.kwhByDevice('day'),
      this.consumption.kwhByDevice('month'),
    ]);
    const t = tariff();
    return rows.map((d) => {
      const kwhToday = today.get(d.id) ?? 0;
      const kwhMonth = month.get(d.id) ?? 0;
      return { ...d, kwhToday, kwhMonth, costToday: kwhToday * t, costMonth: kwhMonth * t };
    });
  }

  /** Números do card de resumo da página do aparelho. */
  async summary(id: string) {
    await this.get(id);
    const [today, month, week, first, stats] = await Promise.all([
      this.consumption.kwhByDevice('day'),
      this.consumption.kwhByDevice('month'),
      this.consumption.kwhByDevice('week'),
      this.consumption.firstReadingInWeek(id),
      this.consumption.todayStats(id),
    ]);
    const t = tariff();
    const kwhToday = today.get(id) ?? 0;
    const kwhMonth = month.get(id) ?? 0;
    const proj = this.consumption.projection(kwhMonth, week.get(id) ?? 0, first);
    return {
      tariff: t,
      kwhToday,
      kwhMonth,
      costToday: kwhToday * t,
      costMonth: kwhMonth * t,
      avgDailyKwh: proj.avgDailyKwh,
      projectedKwh: proj.projectedKwh,
      projectedCost: proj.projectedKwh == null ? null : proj.projectedKwh * t,
      ...stats,
    };
  }

  async find(id: string) {
    const [d] = await this.db.select().from(devices).where(eq(devices.id, id));
    return d;
  }

  async get(id: string) {
    const d = await this.find(id);
    if (!d) throw new NotFoundException('Dispositivo não encontrado');
    return d;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.get(id);
    const [d] = await this.db.update(devices).set(dto).where(eq(devices.id, id)).returning();
    return d;
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.delete(devices).where(eq(devices.id, id));
    return { ok: true };
  }

  async sendRelay(id: string, cmd: RelayCommand, source: EventSource) {
    const d = await this.get(id);
    if (!d.online) throw new ConflictException('Dispositivo offline');
    const target = cmd === 'TOGGLE' ? (d.relayOn ? 'OFF' : 'ON') : cmd;
    this.pending.set(id, { source, at: Date.now() });
    await this.mqtt.publish(id, 'relay/set', target);
    if (source === 'app')
      await this.events.log(id, 'COMMAND', 'app', `Comando ${target === 'ON' ? 'ligar' : 'desligar'} enviado`);
    return { sent: true, target };
  }

  async resetEnergy(id: string) {
    const d = await this.get(id);
    if (!d.online) throw new ConflictException('Dispositivo offline');
    await this.mqtt.publish(id, 'energy/reset', '1');
    await this.events.log(id, 'ENERGY_RESET', 'app', 'Contador de energia do sensor zerado');
    return { sent: true };
  }

  consumePendingSource(id: string): EventSource | undefined {
    const p = this.pending.get(id);
    this.pending.delete(id);
    if (!p || Date.now() - p.at > 20_000) return undefined;
    return p.source;
  }
}

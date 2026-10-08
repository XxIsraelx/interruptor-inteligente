import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { and, eq, lt } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';
import { Device, devices, readings } from '../db/schema';
import { MqttService } from '../mqtt/mqtt.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { EventsService } from './events.service';
import { DevicesService } from './devices.service';

interface Telemetry {
  v?: number | null;
  i?: number | null;
  p?: number | null;
  e?: number | null;
  f?: number | null;
  pf?: number | null;
  relay?: boolean;
  rssi?: number;
  fw?: string;
}

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Recebe as mensagens MQTT dos ESP32 e transforma em dados no banco + eventos em tempo real. */
@Injectable()
export class IngestService implements OnModuleInit {
  private readonly log = new Logger(IngestService.name);
  /** Dispositivos em que a regra de potência máxima já mandou desligar (evita repetir). */
  private ruleTripped = new Set<string>();

  constructor(
    private readonly mqtt: MqttService,
    @InjectDb() private readonly db: Db,
    private readonly rt: RealtimeGateway,
    private readonly events: EventsService,
    private readonly deviceSvc: DevicesService,
  ) {}

  onModuleInit() {
    this.mqtt.onMessage((id, channel, payload) => {
      const text = payload.toString().trim();
      if (channel === 'telemetry') return this.onTelemetry(id, text);
      if (channel === 'status') return this.onStatus(id, text);
      if (channel === 'relay/state') return this.onRelayState(id, text);
    });
  }

  private async ensureDevice(id: string): Promise<Device> {
    const existing = await this.deviceSvc.find(id);
    if (existing) return existing;
    this.log.log(`Novo dispositivo detectado: ${id}`);
    await this.db
      .insert(devices)
      .values({ id, name: `Dispositivo ${id.slice(-6)}` })
      .onConflictDoNothing();
    return (await this.deviceSvc.find(id))!;
  }

  private async onTelemetry(id: string, text: string) {
    let t: Telemetry;
    try {
      t = JSON.parse(text);
    } catch {
      this.log.warn(`Telemetria inválida de ${id}: ${text.slice(0, 80)}`);
      return;
    }
    const device = await this.ensureDevice(id);
    const now = new Date();
    const values = {
      voltage: num(t.v),
      current: num(t.i),
      power: num(t.p),
      energy: num(t.e),
      frequency: num(t.f),
      powerFactor: num(t.pf),
    };
    const relayOn = typeof t.relay === 'boolean' ? t.relay : device.relayOn;

    const [reading] = await this.db
      .insert(readings)
      .values({ deviceId: id, ts: now, relayOn, ...values })
      .returning();

    const [updated] = await this.db
      .update(devices)
      .set({
        ...values,
        online: true,
        lastSeenAt: now,
        rssi: typeof t.rssi === 'number' ? Math.round(t.rssi) : device.rssi,
        firmware: typeof t.fw === 'string' ? t.fw.slice(0, 20) : device.firmware,
      })
      .where(eq(devices.id, id))
      .returning();

    this.rt.emit('reading', reading);
    this.rt.emit('device:update', updated);
    if (!device.online) await this.events.log(id, 'ONLINE', 'device', 'Dispositivo conectou');

    // Regra de proteção: potência acima do limite configurado → desliga o relé.
    if (
      updated.maxPowerW != null &&
      values.power != null &&
      values.power > updated.maxPowerW &&
      updated.relayOn &&
      !this.ruleTripped.has(id)
    ) {
      this.ruleTripped.add(id);
      await this.events.log(
        id,
        'RULE',
        'rule',
        `Potência ${values.power.toFixed(0)} W acima do limite de ${updated.maxPowerW} W — desligando`,
      );
      await this.deviceSvc.sendRelay(id, 'OFF', 'rule').catch((e) => this.log.error(e.message));
    }
  }

  private async onStatus(id: string, text: string) {
    const online = text.toLowerCase() === 'online';
    const device = await this.ensureDevice(id);
    if (device.online === online) return;
    const [updated] = await this.db
      .update(devices)
      .set({ online, ...(online ? { lastSeenAt: new Date() } : {}) })
      .where(eq(devices.id, id))
      .returning();
    this.rt.emit('device:update', updated);
    await this.events.log(id, online ? 'ONLINE' : 'OFFLINE', 'device', online ? 'Dispositivo conectou' : 'Dispositivo desconectou');
  }

  private async onRelayState(id: string, text: string) {
    const relayOn = text.toUpperCase() === 'ON';
    const device = await this.ensureDevice(id);
    if (!relayOn) this.ruleTripped.delete(id);
    if (device.relayOn === relayOn) return;
    const [updated] = await this.db.update(devices).set({ relayOn }).where(eq(devices.id, id)).returning();
    this.rt.emit('device:update', updated);
    const source = this.deviceSvc.consumePendingSource(id) ?? 'device';
    const via = { app: 'pelo app', schedule: 'por agendamento', rule: 'pela regra de potência', device: 'no dispositivo', system: 'pelo sistema' }[source];
    await this.events.log(id, relayOn ? 'RELAY_ON' : 'RELAY_OFF', source, `${relayOn ? 'Ligado' : 'Desligado'} ${via}`);
  }

  /** Marca como offline quem parou de mandar telemetria (caso o LWT não chegue). */
  @Interval(10_000)
  async markStale() {
    const secs = Number(process.env.OFFLINE_AFTER_SECONDS ?? 30);
    const limit = new Date(Date.now() - secs * 1000);
    const stale = await this.db
      .update(devices)
      .set({ online: false })
      .where(and(eq(devices.online, true), lt(devices.lastSeenAt, limit)))
      .returning();
    for (const updated of stale) {
      const d = updated;
      this.rt.emit('device:update', updated);
      await this.events.log(d.id, 'OFFLINE', 'system', `Sem dados há mais de ${secs} s`);
    }
  }
}

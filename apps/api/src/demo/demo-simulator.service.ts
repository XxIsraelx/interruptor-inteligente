import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { connect, MqttClient } from 'mqtt';
import { Db, InjectDb } from '../db/db.module';
import { devices } from '../db/schema';
import { brokerAuth, brokerUrl, topicPrefix } from '../mqtt/config';
import { DEMO_PROFILES, DemoProfile, fridgeRunning, hasAnyReading, seedDemoHistory } from './demo-data';

/**
 * Modo demonstração (sem hardware):
 *  - DEMO_SEED=true      → se o banco estiver vazio, cria 7 dias de histórico falso
 *  - DEMO_SIMULATOR=true → simula 3 ESP32 conectados ao broker, seguindo docs/MQTT.md
 * Quando o ESP32 real entrar, basta desligar DEMO_SIMULATOR.
 */
@Injectable()
export class DemoSimulatorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('Demo');
  private clients: MqttClient[] = [];
  private timers: NodeJS.Timeout[] = [];

  constructor(@InjectDb() private readonly db: Db) {}

  async onApplicationBootstrap() {
    if (process.env.DEMO_SEED === 'true' && !(await hasAnyReading(this.db))) {
      this.log.log('Banco vazio: gerando 7 dias de histórico de demonstração...');
      await seedDemoHistory(this.db, 7, (m) => this.log.log(m));
    }
    if (process.env.DEMO_SIMULATOR !== 'true') return;

    // Como o ESP32 real (que guarda o estado na memória), retoma relé e contador do banco
    const saved = await this.db
      .select({ id: devices.id, relayOn: devices.relayOn, energy: devices.energy })
      .from(devices)
      .where(inArray(devices.id, DEMO_PROFILES.map((p) => p.id)));
    const byId = new Map(saved.map((d) => [d.id, d]));

    const interval = Number(process.env.SIM_INTERVAL_MS ?? 5000);
    for (const p of DEMO_PROFILES) {
      const s = byId.get(p.id);
      this.startDevice(p, s?.relayOn ?? true, s?.energy ?? 0, interval);
    }
    this.log.log(`Simulando ${DEMO_PROFILES.length} dispositivos (a cada ${interval / 1000} s)`);
  }

  private startDevice(p: DemoProfile, relayOn: boolean, energy: number, interval: number) {
    const base = `${topicPrefix()}/${p.id}`;
    const state = { relay: relayOn, energy, last: Date.now() };
    const client = connect(brokerUrl(), {
      ...brokerAuth(),
      clientId: p.id,
      will: { topic: `${base}/status`, payload: Buffer.from('offline'), qos: 1, retain: true },
      reconnectPeriod: 3000,
    });
    this.clients.push(client);

    const publishRelay = () => client.publish(`${base}/relay/state`, state.relay ? 'ON' : 'OFF', { qos: 1, retain: true });

    const sendTelemetry = () => {
      const now = Date.now();
      const v = 127 + (Math.random() - 0.5) * 4;
      const active = state.relay && (!p.cycle || fridgeRunning(now));
      const w = active ? p.watts * (1 + (Math.random() - 0.5) * 2 * p.jitter) : 0;
      const pf = active ? p.pf : 0;
      state.energy += (w * (now - state.last)) / 3_600_000 / 1000;
      state.last = now;
      const payload = {
        v: +v.toFixed(1),
        i: active ? +(w / (v * pf)).toFixed(3) : 0,
        p: +w.toFixed(1),
        e: +state.energy.toFixed(4),
        f: 60,
        pf: +pf.toFixed(2),
        relay: state.relay,
        rssi: -55 - Math.round(Math.random() * 15),
        fw: 'sim-0.1.0',
      };
      client.publish(`${base}/telemetry`, JSON.stringify(payload));
    };

    client.on('connect', () => {
      client.publish(`${base}/status`, 'online', { qos: 1, retain: true });
      publishRelay();
      client.subscribe([`${base}/relay/set`, `${base}/energy/reset`], { qos: 1 });
    });
    client.on('error', (e) => this.log.warn(`[${p.id}] ${e.message}`));
    client.on('message', (topic, payload) => {
      const msg = payload.toString().trim().toUpperCase();
      if (topic.endsWith('/relay/set')) {
        state.relay = msg === 'TOGGLE' ? !state.relay : msg === 'ON';
        publishRelay();
        sendTelemetry();
      } else if (topic.endsWith('/energy/reset')) {
        state.energy = 0;
      }
    });

    this.timers.push(setInterval(() => client.connected && sendTelemetry(), interval));
  }

  async onApplicationShutdown() {
    this.timers.forEach(clearInterval);
    await Promise.all(this.clients.map((c) => c.endAsync()));
  }
}

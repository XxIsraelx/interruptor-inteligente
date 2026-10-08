import { and, eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { devices, events, readings, schedules } from '../db/schema';

/** Aparelhos falsos usados na demonstração (simulador + histórico). */
export interface DemoProfile {
  id: string;
  name: string;
  location: string;
  icon: string;
  watts: number; // potência nominal quando ligado
  jitter: number; // variação aleatória (0.1 = ±10%)
  pf: number; // fator de potência
  /** Horas do dia (local) em que o aparelho costuma ficar ligado no histórico */
  hours: [number, number];
  /** Liga e desliga sozinho (compressor de geladeira) */
  cycle?: boolean;
}

export const DEMO_PROFILES: DemoProfile[] = [
  { id: 'sim-ar', name: 'Ar-condicionado', location: 'Quarto', icon: 'snowflake', watts: 650, jitter: 0.08, pf: 0.92, hours: [18, 23] },
  { id: 'sim-geladeira', name: 'Geladeira', location: 'Cozinha', icon: 'fridge', watts: 120, jitter: 0.15, pf: 0.85, hours: [0, 24], cycle: true },
  { id: 'sim-tv', name: 'TV', location: 'Sala', icon: 'tv', watts: 90, jitter: 0.05, pf: 0.97, hours: [19, 23] },
];

const TZ = () => process.env.TZ || 'America/Sao_Paulo';

/** Compressor da geladeira: ligado ~60% do tempo, ciclos de alguns minutos. */
export const fridgeRunning = (t: number) => Math.sin(t / 120_000) > -0.2;

/** Ar-condicionado inverter: a potência sobe e desce suavemente (70% a 100% do nominal). */
export const inverterFactor = (t: number) => 0.85 + 0.15 * Math.sin(t / 90_000);

/** Rotina de uso dos aparelhos de demonstração (mostra os agendamentos funcionando). */
export const DEMO_SCHEDULES: { deviceId: string; action: 'ON' | 'OFF'; time: string }[] = [
  { deviceId: 'sim-ar', action: 'ON', time: '18:00' },
  { deviceId: 'sim-ar', action: 'OFF', time: '23:00' },
  { deviceId: 'sim-tv', action: 'ON', time: '19:00' },
  { deviceId: 'sim-tv', action: 'OFF', time: '23:30' },
];

/**
 * Cria a rotina de demonstração para os aparelhos simulados que ainda não têm
 * agendamento nenhum (e nunca rodaram um) — não recria o que o usuário apagou.
 */
export async function ensureDemoSchedules(db: NodePgDatabase<any>, log: (m: string) => void = console.log) {
  const ids = [...new Set(DEMO_SCHEDULES.map((s) => s.deviceId))];
  const existing = await db.select({ id: devices.id }).from(devices).where(inArray(devices.id, ids));
  for (const { id } of existing) {
    const [hasSchedule] = await db.select({ id: schedules.id }).from(schedules).where(eq(schedules.deviceId, id)).limit(1);
    const [ranBefore] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.deviceId, id), eq(events.type, 'SCHEDULE')))
      .limit(1);
    if (hasSchedule || ranBefore) continue;
    const rows = DEMO_SCHEDULES.filter((s) => s.deviceId === id).map((s) => ({
      deviceId: id,
      action: s.action,
      time: s.time,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    }));
    await db.insert(schedules).values(rows);
    log(`Rotina de demonstração criada para ${id} (${rows.map((r) => `${r.action} ${r.time}`).join(', ')})`);
  }
}

/**
 * Gera `days` dias de leituras (1 por minuto) para os aparelhos de demonstração,
 * para os gráficos de histórico já começarem preenchidos.
 */
export async function seedDemoHistory(db: NodePgDatabase<any>, days = 7, log: (m: string) => void = console.log) {
  const now = Date.now();
  const start = now - days * 24 * 3600 * 1000;
  const stepMs = 60_000;
  const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ(), hour: '2-digit', hourCycle: 'h23' });

  for (const d of DEMO_PROFILES) {
    await db
      .insert(devices)
      .values({ id: d.id, name: d.name, location: d.location, icon: d.icon, relayOn: true })
      .onConflictDoNothing();
    await db.delete(readings).where(eq(readings.deviceId, d.id));

    let energy = 0;
    let batch: (typeof readings.$inferInsert)[] = [];
    for (let t = start; t < now; t += stepMs) {
      const hour = Number(hourFmt.format(t));
      const on = d.cycle ? fridgeRunning(t) : hour >= d.hours[0] && hour < d.hours[1];
      const voltage = 127 + (Math.random() - 0.5) * 4;
      const shape = d.id === 'sim-ar' ? inverterFactor(t) : 1;
      const power = on ? d.watts * shape * (1 + (Math.random() - 0.5) * 2 * d.jitter) : 0;
      energy += (power * stepMs) / 3_600_000 / 1000; // W·ms → kWh
      batch.push({
        deviceId: d.id,
        ts: new Date(t),
        voltage,
        current: on ? power / (voltage * d.pf) : 0,
        power,
        energy,
        frequency: 60,
        powerFactor: on ? d.pf : 0,
        relayOn: true,
      });
      if (batch.length >= 2000) {
        await db.insert(readings).values(batch);
        batch = [];
      }
    }
    if (batch.length) await db.insert(readings).values(batch);
    // O contador do "sensor" continua de onde o histórico parou
    await db.update(devices).set({ energy }).where(eq(devices.id, d.id));
    log(`${d.name}: ${energy.toFixed(2)} kWh em ${days} dias`);
  }
}

export async function hasAnyReading(db: NodePgDatabase<any>) {
  const res = await db.execute<{ exists: boolean }>(sql`SELECT EXISTS (SELECT 1 FROM readings) AS exists`);
  return Boolean(res.rows[0]?.exists);
}

import { createId } from './id';
import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const devices = pgTable('devices', {
  id: text('id').primaryKey(), // mesmo id usado nos tópicos MQTT
  name: text('name').notNull(),
  location: text('location'),
  icon: text('icon').notNull().default('plug'),
  online: boolean('online').notNull().default(false),
  relayOn: boolean('relay_on').notNull().default(false),
  lastSeenAt: ts('last_seen_at'),
  // Última leitura (cache para o dashboard)
  voltage: doublePrecision('voltage'),
  current: doublePrecision('current'),
  power: doublePrecision('power'),
  energy: doublePrecision('energy'),
  frequency: doublePrecision('frequency'),
  powerFactor: doublePrecision('power_factor'),
  rssi: integer('rssi'),
  firmware: text('firmware'),
  // Regra de proteção: desliga o relé se a potência passar deste valor (W)
  maxPowerW: doublePrecision('max_power_w'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const readings = pgTable(
  'readings',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    ts: ts('ts').notNull().defaultNow(),
    voltage: doublePrecision('voltage'),
    current: doublePrecision('current'),
    power: doublePrecision('power'),
    energy: doublePrecision('energy'), // kWh acumulado no PZEM
    frequency: doublePrecision('frequency'),
    powerFactor: doublePrecision('power_factor'),
    relayOn: boolean('relay_on').notNull(),
  },
  (t) => [index('readings_device_ts_idx').on(t.deviceId, t.ts)],
);

export const eventType = pgEnum('event_type', [
  'RELAY_ON',
  'RELAY_OFF',
  'COMMAND',
  'ONLINE',
  'OFFLINE',
  'SCHEDULE',
  'RULE',
  'ENERGY_RESET',
]);

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    ts: ts('ts').notNull().defaultNow(),
    type: eventType('type').notNull(),
    source: text('source').notNull(), // device | app | schedule | rule | system
    message: text('message').notNull(),
  },
  (t) => [index('events_device_ts_idx').on(t.deviceId, t.ts)],
);

export const relayAction = pgEnum('relay_action', ['ON', 'OFF']);

export const schedules = pgTable(
  'schedules',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    action: relayAction('action').notNull(),
    time: text('time').notNull(), // "HH:mm" no fuso TZ
    daysOfWeek: integer('days_of_week').array().notNull(), // 0 = domingo ... 6 = sábado
    enabled: boolean('enabled').notNull().default(true),
    lastRunAt: ts('last_run_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('schedules_device_idx').on(t.deviceId)],
);

export type Device = typeof devices.$inferSelect;
export type Reading = typeof readings.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type EventType = (typeof eventType.enumValues)[number];

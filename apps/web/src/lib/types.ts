export interface Device {
  id: string;
  name: string;
  location: string | null;
  icon: string;
  online: boolean;
  relayOn: boolean;
  lastSeenAt: string | null;
  voltage: number | null;
  current: number | null;
  power: number | null;
  energy: number | null;
  frequency: number | null;
  powerFactor: number | null;
  rssi: number | null;
  firmware: string | null;
  maxPowerW: number | null;
  createdAt: string;
  updatedAt: string;
  // vindos de GET /devices
  kwhToday?: number;
  kwhMonth?: number;
  costToday?: number;
  costMonth?: number;
}

export interface Reading {
  id: number;
  deviceId: string;
  ts: string;
  voltage: number | null;
  current: number | null;
  power: number | null;
  energy: number | null;
  frequency: number | null;
  powerFactor: number | null;
  relayOn: boolean;
}

export type EventType = 'RELAY_ON' | 'RELAY_OFF' | 'COMMAND' | 'ONLINE' | 'OFFLINE' | 'SCHEDULE' | 'RULE' | 'ENERGY_RESET';

export interface DeviceEvent {
  id: number;
  deviceId: string;
  ts: string;
  type: EventType;
  source: string;
  message: string;
}

export interface Schedule {
  id: string;
  deviceId: string;
  action: 'ON' | 'OFF';
  time: string;
  daysOfWeek: number[];
  enabled: boolean;
  lastRunAt: string | null;
}

export interface Overview {
  tariff: number;
  devices: number;
  online: number;
  powerNow: number;
  kwhToday: number;
  kwhMonth: number;
  costToday: number;
  costMonth: number;
  ranking: { id: string; name: string; kwhMonth: number; costMonth: number; share: number }[];
}

export interface PowerPoint {
  bucket: string;
  power: number | null;
  maxPower: number | null;
  voltage: number | null;
  current: number | null;
}

export interface ConsumptionSeries {
  period: 'day' | 'week' | 'month';
  tariff: number;
  totalKwh: number;
  totalCost: number;
  buckets: { bucket: string; kwh: number }[];
}

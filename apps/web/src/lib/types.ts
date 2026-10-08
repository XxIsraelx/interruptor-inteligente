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
  timezone: string;
  tariff: number;
  devices: number;
  online: number;
  on: number;
  powerNow: number;
  avgVoltage: number | null;
  kwhToday: number;
  kwhMonth: number;
  costToday: number;
  costMonth: number;
  avgDailyKwh: number | null;
  projectedKwh: number | null;
  projectedCost: number | null;
  monthProgress: number;
  dayOfMonth: number;
  daysInMonth: number;
  ranking: { id: string; name: string; kwhMonth: number; costMonth: number; share: number }[];
}

export interface PowerPoint {
  bucket: string;
  power: number | null;
  maxPower: number | null;
  voltage: number | null;
  current: number | null;
}

export type Period = 'day' | 'week' | 'month';

export interface ConsumptionBucket {
  bucket: string;
  label: string;
  future: boolean;
  kwh: number;
  byDevice?: Record<string, number>;
}

export interface ConsumptionSeries {
  period: Period;
  tariff: number;
  totalKwh: number;
  totalCost: number;
  buckets: ConsumptionBucket[];
}

export interface HouseConsumption extends ConsumptionSeries {
  devices: { id: string; name: string; kwh: number; cost: number; share: number }[];
}

export interface LivePoint {
  t: number; // epoch ms
  p: number; // W
}

export interface LiveData {
  binSeconds: number;
  minutes: number;
  devices: Record<string, LivePoint[]>;
  total: LivePoint[];
}

export interface DeviceSummary {
  tariff: number;
  kwhToday: number;
  kwhMonth: number;
  costToday: number;
  costMonth: number;
  avgDailyKwh: number | null;
  projectedKwh: number | null;
  projectedCost: number | null;
  onSecondsToday: number;
  peakTodayW: number | null;
  peakTodayAt: string | null;
}

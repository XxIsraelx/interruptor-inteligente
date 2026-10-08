import { Injectable } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';

export type Period = 'day' | 'week' | 'month';
export type Range = '1h' | '6h' | '24h' | '7d';

const TZ = () => process.env.TZ || 'America/Sao_Paulo';

/** Intervalo de agrupamento usado no gráfico de potência para cada janela. */
const RANGE_CFG: Record<Range, { span: string; bin: string }> = {
  '1h': { span: '1 hour', bin: '30 seconds' },
  '6h': { span: '6 hours', bin: '2 minutes' },
  '24h': { span: '24 hours', bin: '5 minutes' },
  '7d': { span: '7 days', bin: '1 hour' },
};

/**
 * Cálculos de consumo a partir do kWh acumulado do PZEM.
 * Consumo = soma dos incrementos positivos entre leituras consecutivas,
 * o que ignora resets do contador (valor voltando a zero).
 */
@Injectable()
export class ConsumptionService {
  constructor(@InjectDb() private readonly db: Db) {}

  /** Início do período (hoje, últimos 7 dias, mês atual) no fuso local. */
  private periodStart(period: Period): SQL {
    const tz = TZ();
    if (period === 'week')
      return sql`((date_trunc('day', now() AT TIME ZONE ${tz}) - interval '6 days') AT TIME ZONE ${tz})`;
    return sql`(date_trunc(${period}, now() AT TIME ZONE ${tz}) AT TIME ZONE ${tz})`;
  }

  /** kWh consumido por dispositivo desde o início do período. */
  async kwhByDevice(period: Period): Promise<Map<string, number>> {
    const res = await this.db.execute<{ device_id: string; kwh: number }>(sql`
      WITH r AS (
        SELECT device_id,
               energy - LAG(energy) OVER (PARTITION BY device_id ORDER BY ts) AS d
        FROM readings
        WHERE ts >= ${this.periodStart(period)} AND energy IS NOT NULL
      )
      SELECT device_id, COALESCE(SUM(GREATEST(d, 0)), 0)::float8 AS kwh
      FROM r GROUP BY device_id`);
    return new Map(res.rows.map((r) => [r.device_id, Number(r.kwh)]));
  }

  /** Consumo agrupado por hora (dia) ou por dia (semana/mês). deviceId null = todos. */
  async series(deviceId: string | null, period: Period) {
    const tz = TZ();
    const unit = period === 'day' ? 'hour' : 'day';
    const devFilter = deviceId ? sql`AND device_id = ${deviceId}` : sql``;
    const res = await this.db.execute<{ bucket: Date; kwh: number }>(sql`
      WITH r AS (
        SELECT ts,
               energy - LAG(energy) OVER (PARTITION BY device_id ORDER BY ts) AS d
        FROM readings
        WHERE ts >= ${this.periodStart(period)} AND energy IS NOT NULL ${devFilter}
      )
      SELECT date_trunc(${unit}, ts AT TIME ZONE ${tz}) AT TIME ZONE ${tz} AS bucket,
             COALESCE(SUM(GREATEST(d, 0)), 0)::float8 AS kwh
      FROM r GROUP BY 1 ORDER BY 1`);
    return res.rows.map((r) => ({ bucket: new Date(r.bucket), kwh: Number(r.kwh) }));
  }

  /** Potência/tensão/corrente médias por intervalo para o gráfico de linha. */
  async power(deviceId: string, range: Range) {
    const cfg = RANGE_CFG[range] ?? RANGE_CFG['1h'];
    const res = await this.db.execute<{
      bucket: Date;
      power: number | null;
      max_power: number | null;
      voltage: number | null;
      current: number | null;
    }>(sql`
      SELECT date_bin(${cfg.bin}::interval, ts, TIMESTAMPTZ '2000-01-01 00:00:00+00') AS bucket,
             AVG(power)::float8   AS power,
             MAX(power)::float8   AS max_power,
             AVG(voltage)::float8 AS voltage,
             AVG(current)::float8 AS current
      FROM readings
      WHERE device_id = ${deviceId}
        AND ts >= now() - ${cfg.span}::interval
      GROUP BY 1 ORDER BY 1`);
    return res.rows.map((r) => ({
      bucket: new Date(r.bucket),
      power: r.power,
      maxPower: r.max_power,
      voltage: r.voltage,
      current: r.current,
    }));
  }
}

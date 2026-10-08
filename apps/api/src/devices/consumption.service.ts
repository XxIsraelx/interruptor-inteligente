import { Injectable } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';

export type Period = 'day' | 'week' | 'month';
export type Range = '1h' | '6h' | '24h' | '7d';

export const TZ = () => process.env.TZ || 'America/Sao_Paulo';

/** Intervalo de agrupamento usado no gráfico de potência para cada janela. */
const RANGE_CFG: Record<Range, { span: string; bin: string }> = {
  '1h': { span: '1 hour', bin: '30 seconds' },
  '6h': { span: '6 hours', bin: '2 minutes' },
  '24h': { span: '24 hours', bin: '5 minutes' },
  '7d': { span: '7 days', bin: '1 hour' },
};

/** Rótulo de cada barra: hora (hoje), dia/mês (7 dias) ou dia (mês). */
const LABEL_FMT: Record<Period, string> = { day: 'HH24"h"', week: 'DD/MM', month: 'DD' };

export interface SeriesBucket {
  bucket: Date;
  label: string;
  future: boolean;
  kwh: number; // total do bucket (todos os aparelhos filtrados)
  byDevice: Record<string, number>;
}

/** Data/hora "de parede" no fuso configurado (dia do mês, dias no mês, fração do dia). */
export function localCalendar(tz = TZ(), now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const dayOfMonth = Number(parts.day);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayFraction = (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) / 86400;
  return { year, month, dayOfMonth, daysInMonth, dayFraction };
}

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

  /**
   * Consumo do período em barras completas: 24 horas (hoje), 7 dias ou todos os dias
   * do mês — inclusive as que ainda não chegaram (future=true), para o gráfico mostrar
   * a linha do tempo inteira. Cada barra traz o total e a divisão por aparelho.
   */
  async series(deviceId: string | null, period: Period): Promise<SeriesBucket[]> {
    const tz = TZ();
    const unit = period === 'day' ? 'hour' : 'day';
    const step = period === 'day' ? sql`interval '1 hour'` : sql`interval '1 day'`;
    const devFilter = deviceId ? sql`AND device_id = ${deviceId}` : sql``;
    const startLocal =
      period === 'day'
        ? sql`date_trunc('day', now() AT TIME ZONE ${tz})`
        : period === 'week'
          ? sql`(date_trunc('day', now() AT TIME ZONE ${tz}) - interval '6 days')`
          : sql`date_trunc('month', now() AT TIME ZONE ${tz})`;
    const endLocal =
      period === 'day'
        ? sql`(date_trunc('day', now() AT TIME ZONE ${tz}) + interval '23 hours')`
        : period === 'week'
          ? sql`date_trunc('day', now() AT TIME ZONE ${tz})`
          : sql`(date_trunc('month', now() AT TIME ZONE ${tz}) + interval '1 month' - interval '1 day')`;

    const res = await this.db.execute<{
      bucket: Date;
      label: string;
      future: boolean;
      device_id: string | null;
      kwh: number;
    }>(sql`
      WITH slots AS (
        SELECT gs AS local_ts FROM generate_series(${startLocal}, ${endLocal}, ${step}) AS gs
      ),
      r AS (
        SELECT device_id, ts,
               energy - LAG(energy) OVER (PARTITION BY device_id ORDER BY ts) AS d
        FROM readings
        WHERE ts >= (${startLocal} AT TIME ZONE ${tz}) AND energy IS NOT NULL ${devFilter}
      ),
      agg AS (
        SELECT date_trunc(${unit}, ts AT TIME ZONE ${tz}) AS local_ts, device_id,
               SUM(GREATEST(d, 0))::float8 AS kwh
        FROM r GROUP BY 1, 2
      )
      SELECT (s.local_ts AT TIME ZONE ${tz}) AS bucket,
             to_char(s.local_ts, ${LABEL_FMT[period]}) AS label,
             (s.local_ts AT TIME ZONE ${tz}) > now() AS future,
             a.device_id,
             COALESCE(a.kwh, 0)::float8 AS kwh
      FROM slots s
      LEFT JOIN agg a ON a.local_ts = s.local_ts
      ORDER BY s.local_ts`);

    const out = new Map<string, SeriesBucket>();
    for (const row of res.rows) {
      const bucket = new Date(row.bucket);
      const key = bucket.toISOString();
      let b = out.get(key);
      if (!b) {
        b = { bucket, label: row.label, future: Boolean(row.future), kwh: 0, byDevice: {} };
        out.set(key, b);
      }
      if (row.device_id) {
        const kwh = Number(row.kwh);
        b.byDevice[row.device_id] = (b.byDevice[row.device_id] ?? 0) + kwh;
        b.kwh += kwh;
      }
    }
    return [...out.values()];
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

  /** Potência dos últimos minutos em janelas de 10 s, por aparelho (mini-gráficos ao vivo). */
  async live(minutes: number) {
    const res = await this.db.execute<{ device_id: string; t: Date; p: number }>(sql`
      SELECT device_id,
             date_bin('10 seconds', ts, TIMESTAMPTZ '2000-01-01 00:00:00+00') AS t,
             AVG(power)::float8 AS p
      FROM readings
      WHERE ts >= now() - make_interval(mins => ${minutes}) AND power IS NOT NULL
      GROUP BY 1, 2
      ORDER BY 2`);
    return res.rows.map((r) => ({ deviceId: r.device_id, t: new Date(r.t).getTime(), p: Number(r.p) }));
  }

  /** Primeira leitura desde o início da janela de 7 dias (base da média diária). */
  async firstReadingInWeek(deviceId?: string): Promise<Date | null> {
    const devFilter = deviceId ? sql`AND device_id = ${deviceId}` : sql``;
    const res = await this.db.execute<{ first: Date | null }>(sql`
      SELECT MIN(ts) AS first FROM readings WHERE ts >= ${this.periodStart('week')} ${devFilter}`);
    const first = res.rows[0]?.first;
    return first ? new Date(first) : null;
  }

  /**
   * Previsão do mês: o que já foi gasto + média diária dos últimos 7 dias × dias que faltam.
   * Retorna null enquanto houver menos de 1 h de dados para tirar a média.
   */
  projection(kwhMonth: number, kwhWeek: number, firstInWeek: Date | null) {
    const cal = localCalendar();
    const now = Date.now();
    const weekStart = now - (6 + cal.dayFraction) * 86_400_000;
    const from = firstInWeek ? Math.max(weekStart, firstInWeek.getTime()) : null;
    const elapsedDays = from ? (now - from) / 86_400_000 : 0;
    const monthProgress = (cal.dayOfMonth - 1 + cal.dayFraction) / cal.daysInMonth;
    const base = { dayOfMonth: cal.dayOfMonth, daysInMonth: cal.daysInMonth, monthProgress };
    if (elapsedDays < 1 / 24) return { ...base, avgDailyKwh: null, projectedKwh: null };
    const avgDailyKwh = kwhWeek / elapsedDays;
    const remainingDays = cal.daysInMonth - (cal.dayOfMonth - 1) - cal.dayFraction;
    return { ...base, avgDailyKwh, projectedKwh: kwhMonth + avgDailyKwh * remainingDays };
  }

  /** Pico de potência e tempo ligado (potência > 1 W) de hoje para um aparelho. */
  async todayStats(deviceId: string) {
    const res = await this.db.execute<{ on_seconds: number; peak: number | null; peak_at: Date | null }>(sql`
      WITH r AS (
        SELECT ts, power, LEAD(ts) OVER (ORDER BY ts) AS next_ts
        FROM readings
        WHERE device_id = ${deviceId} AND ts >= ${this.periodStart('day')}
      )
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM LEAST(COALESCE(next_ts, now()) - ts, interval '60 seconds')))
                        FILTER (WHERE power > 1), 0)::float8 AS on_seconds,
             MAX(power)::float8 AS peak,
             (ARRAY_AGG(ts ORDER BY power DESC NULLS LAST))[1] AS peak_at
      FROM r`);
    const row = res.rows[0];
    return {
      onSecondsToday: Number(row?.on_seconds ?? 0),
      peakTodayW: row?.peak ?? null,
      peakTodayAt: row?.peak_at ? new Date(row.peak_at) : null,
    };
  }
}

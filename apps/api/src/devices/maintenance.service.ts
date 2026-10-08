import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';

/**
 * Mantém o banco pequeno:
 *  - leituras com mais de 2 dias ficam com 1 por minuto (o consumo em kWh não muda,
 *    porque o contador do PZEM é acumulado);
 *  - leituras mais antigas que READINGS_RETENTION_DAYS (padrão 40) são apagadas;
 *  - eventos mais antigos que 90 dias são apagados.
 */
@Injectable()
export class MaintenanceService {
  private readonly log = new Logger(MaintenanceService.name);

  constructor(@InjectDb() private readonly db: Db) {}

  @Cron(CronExpression.EVERY_HOUR)
  async thinOldReadings() {
    const res = await this.db.execute(sql`
      DELETE FROM readings r
      USING (
        SELECT id FROM (
          SELECT id, row_number() OVER (
                   PARTITION BY device_id, date_trunc('minute', ts) ORDER BY ts DESC
                 ) AS rn
          FROM readings
          WHERE ts < now() - interval '2 days' AND ts >= now() - interval '4 days'
        ) t
        WHERE t.rn > 1
      ) d
      WHERE r.id = d.id`);
    if (res.rowCount) this.log.log(`Compactação: ${res.rowCount} leituras antigas removidas`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async applyRetention() {
    const days = Math.max(35, Number(process.env.READINGS_RETENTION_DAYS ?? 40));
    const r = await this.db.execute(sql`DELETE FROM readings WHERE ts < now() - make_interval(days => ${days})`);
    const e = await this.db.execute(sql`DELETE FROM events WHERE ts < now() - interval '90 days'`);
    this.log.log(`Retenção: ${r.rowCount ?? 0} leituras e ${e.rowCount ?? 0} eventos apagados`);
  }
}

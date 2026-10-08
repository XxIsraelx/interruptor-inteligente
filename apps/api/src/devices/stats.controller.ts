import { Controller, Get, Query } from '@nestjs/common';
import { ConsumptionService } from './consumption.service';
import { DevicesService, tariff } from './devices.service';
import { PeriodQuery } from './dto';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly devices: DevicesService,
    private readonly consumption: ConsumptionService,
  ) {}

  /** Visão geral da casa: potência agora, consumo hoje/mês, custo e ranking. */
  @Get('overview')
  async overview() {
    const list = await this.devices.list();
    const t = tariff();
    const sum = (f: (d: (typeof list)[number]) => number) => list.reduce((s, d) => s + f(d), 0);
    const kwhToday = sum((d) => d.kwhToday);
    const kwhMonth = sum((d) => d.kwhMonth);
    return {
      tariff: t,
      devices: list.length,
      online: list.filter((d) => d.online).length,
      powerNow: sum((d) => (d.online && d.relayOn ? d.power ?? 0 : 0)),
      kwhToday,
      kwhMonth,
      costToday: kwhToday * t,
      costMonth: kwhMonth * t,
      ranking: [...list]
        .sort((a, b) => b.kwhMonth - a.kwhMonth)
        .map((d) => ({ id: d.id, name: d.name, kwhMonth: d.kwhMonth, costMonth: d.costMonth, share: kwhMonth ? d.kwhMonth / kwhMonth : 0 })),
    };
  }

  /** Consumo somado de todos os dispositivos. */
  @Get('consumption')
  async consumptionAll(@Query() q: PeriodQuery) {
    const rows = await this.consumption.series(null, q.period);
    const t = tariff();
    const total = rows.reduce((s, r) => s + r.kwh, 0);
    return { period: q.period, tariff: t, totalKwh: total, totalCost: total * t, buckets: rows };
  }
}

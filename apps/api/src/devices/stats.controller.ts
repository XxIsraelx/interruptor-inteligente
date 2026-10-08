import { Controller, Get, Query } from '@nestjs/common';
import { ConsumptionService, TZ } from './consumption.service';
import { DevicesService, tariff } from './devices.service';
import { LiveQuery, PeriodQuery } from './dto';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly devices: DevicesService,
    private readonly consumption: ConsumptionService,
  ) {}

  /** Visão geral da casa: potência agora, consumo hoje/mês, custo, previsão da conta e ranking. */
  @Get('overview')
  async overview() {
    const [list, week, first] = await Promise.all([
      this.devices.list(),
      this.consumption.kwhByDevice('week'),
      this.consumption.firstReadingInWeek(),
    ]);
    const t = tariff();
    const sum = (f: (d: (typeof list)[number]) => number) => list.reduce((s, d) => s + f(d), 0);
    const kwhToday = sum((d) => d.kwhToday);
    const kwhMonth = sum((d) => d.kwhMonth);
    const kwhWeek = [...week.values()].reduce((s, v) => s + v, 0);
    const proj = this.consumption.projection(kwhMonth, kwhWeek, first);
    const online = list.filter((d) => d.online);
    const volts = online.map((d) => d.voltage).filter((v): v is number => v != null);
    return {
      timezone: TZ(),
      tariff: t,
      devices: list.length,
      online: online.length,
      on: online.filter((d) => d.relayOn).length,
      powerNow: sum((d) => (d.online && d.relayOn ? (d.power ?? 0) : 0)),
      avgVoltage: volts.length ? volts.reduce((s, v) => s + v, 0) / volts.length : null,
      kwhToday,
      kwhMonth,
      costToday: kwhToday * t,
      costMonth: kwhMonth * t,
      avgDailyKwh: proj.avgDailyKwh,
      projectedKwh: proj.projectedKwh,
      projectedCost: proj.projectedKwh == null ? null : proj.projectedKwh * t,
      monthProgress: proj.monthProgress,
      dayOfMonth: proj.dayOfMonth,
      daysInMonth: proj.daysInMonth,
      ranking: [...list]
        .sort((a, b) => b.kwhMonth - a.kwhMonth)
        .map((d) => ({
          id: d.id,
          name: d.name,
          kwhMonth: d.kwhMonth,
          costMonth: d.costMonth,
          share: kwhMonth ? d.kwhMonth / kwhMonth : 0,
        })),
    };
  }

  /**
   * Consumo da casa por hora (hoje) ou por dia (7 dias / mês), com a divisão por aparelho.
   * `devices` vem na ordem de cadastro — é essa ordem que define a cor de cada aparelho.
   */
  @Get('consumption')
  async consumptionAll(@Query() q: PeriodQuery) {
    const [buckets, list] = await Promise.all([this.consumption.series(null, q.period), this.devices.list()]);
    const t = tariff();
    const totalKwh = buckets.reduce((s, b) => s + b.kwh, 0);
    const perDevice = new Map<string, number>();
    for (const b of buckets) for (const [id, kwh] of Object.entries(b.byDevice)) perDevice.set(id, (perDevice.get(id) ?? 0) + kwh);
    return {
      period: q.period,
      tariff: t,
      totalKwh,
      totalCost: totalKwh * t,
      devices: list.map((d) => {
        const kwh = perDevice.get(d.id) ?? 0;
        return { id: d.id, name: d.name, kwh, cost: kwh * t, share: totalKwh ? kwh / totalKwh : 0 };
      }),
      buckets,
    };
  }

  /** Potência dos últimos minutos (janelas de 10 s): por aparelho e o total da casa. */
  @Get('live')
  async live(@Query() q: LiveQuery) {
    const rows = await this.consumption.live(q.minutes);
    const devices: Record<string, { t: number; p: number }[]> = {};
    const total = new Map<number, number>();
    for (const r of rows) {
      (devices[r.deviceId] ??= []).push({ t: r.t, p: r.p });
      total.set(r.t, (total.get(r.t) ?? 0) + r.p);
    }
    return {
      binSeconds: 10,
      minutes: q.minutes,
      devices,
      total: [...total.entries()].sort((a, b) => a[0] - b[0]).map(([t, p]) => ({ t, p })),
    };
  }
}

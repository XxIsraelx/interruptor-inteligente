import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ConsumptionService } from './consumption.service';
import { DevicesService, tariff } from './devices.service';
import { EventsService } from './events.service';
import { LimitQuery, PeriodQuery, RangeQuery, RelayDto, UpdateDeviceDto } from './dto';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devices: DevicesService,
    private readonly events: EventsService,
    private readonly consumption: ConsumptionService,
  ) {}

  @Get()
  list() {
    return this.devices.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.devices.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.devices.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devices.remove(id);
  }

  @Post(':id/relay')
  relay(@Param('id') id: string, @Body() dto: RelayDto) {
    return this.devices.sendRelay(id, dto.state, 'app');
  }

  @Post(':id/energy/reset')
  resetEnergy(@Param('id') id: string) {
    return this.devices.resetEnergy(id);
  }

  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.devices.summary(id);
  }

  @Get(':id/events')
  listEvents(@Param('id') id: string, @Query() q: LimitQuery) {
    return this.events.list(id, q.limit);
  }

  @Get(':id/power')
  power(@Param('id') id: string, @Query() q: RangeQuery) {
    return this.consumption.power(id, q.range);
  }

  @Get(':id/consumption')
  async series(@Param('id') id: string, @Query() q: PeriodQuery) {
    const buckets = await this.consumption.series(id, q.period);
    const t = tariff();
    const total = buckets.reduce((s, r) => s + r.kwh, 0);
    return {
      period: q.period,
      tariff: t,
      totalKwh: total,
      totalCost: total * t,
      buckets: buckets.map(({ byDevice: _omit, ...b }) => b),
    };
  }
}

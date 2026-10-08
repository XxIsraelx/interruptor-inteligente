import { Module } from '@nestjs/common';
import { ConsumptionService } from './consumption.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { IngestService } from './ingest.service';
import { MaintenanceService } from './maintenance.service';
import { StatsController } from './stats.controller';

@Module({
  controllers: [DevicesController, StatsController, EventsController],
  providers: [DevicesService, EventsService, ConsumptionService, IngestService, MaintenanceService],
  exports: [DevicesService, EventsService],
})
export class DevicesModule {}

import { Controller, Get, Query } from '@nestjs/common';
import { LimitQuery } from './dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** Linha do tempo da casa toda (o que ligou, desligou, ficou offline, automações). */
  @Get()
  list(@Query() q: LimitQuery) {
    return this.events.listAll(q.limit);
  }
}

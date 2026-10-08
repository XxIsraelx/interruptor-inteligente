import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateScheduleDto, UpdateScheduleDto } from './dto';
import { SchedulesService } from './schedules.service';

@Controller()
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get('devices/:id/schedules')
  list(@Param('id') id: string) {
    return this.schedules.list(id);
  }

  @Post('devices/:id/schedules')
  create(@Param('id') id: string, @Body() dto: CreateScheduleDto) {
    return this.schedules.create(id, dto);
  }

  @Patch('schedules/:sid')
  update(@Param('sid') sid: string, @Body() dto: UpdateScheduleDto) {
    return this.schedules.update(sid, dto);
  }

  @Delete('schedules/:sid')
  remove(@Param('sid') sid: string) {
    return this.schedules.remove(sid);
  }
}

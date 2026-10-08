import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('health')
export class HealthController {
  constructor(private readonly mqtt: MqttService) {}

  @Public()
  @Get()
  health() {
    return { ok: true, mqtt: this.mqtt.isConnected(), time: new Date().toISOString() };
  }
}

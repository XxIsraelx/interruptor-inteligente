import { Global, Module } from '@nestjs/common';
import { EmbeddedBrokerService } from './embedded-broker.service';
import { MqttService } from './mqtt.service';

// EmbeddedBrokerService vem antes: sobe o broker antes do cliente da API conectar.
@Global()
@Module({ providers: [EmbeddedBrokerService, MqttService], exports: [MqttService] })
export class MqttModule {}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { brokerAuth, brokerUrl, topicPrefix } from './config';
import { EmbeddedBrokerService } from './embedded-broker.service';

export type MqttHandler = (deviceId: string, channel: string, payload: Buffer) => void | Promise<void>;

/**
 * Conexão única da API com o broker. Assina os tópicos publicados pelos ESP32
 * (ver docs/MQTT.md) e repassa as mensagens para quem se registrar via onMessage().
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MqttService.name);
  private client?: MqttClient;
  private handlers: MqttHandler[] = [];
  readonly prefix = topicPrefix();

  constructor(private readonly embedded: EmbeddedBrokerService) {}

  async onModuleInit() {
    await this.embedded.ready; // com broker embutido, espera ele subir antes de conectar
    const url = brokerUrl();
    this.client = connect(url, {
      ...brokerAuth(),
      clientId: `api-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 3000,
      clean: true,
    });

    this.client.on('connect', () => {
      this.log.log(`Conectado ao broker ${url.replace(/\/\/[^@/]*@/, "//***@")}`);
      this.client!.subscribe(
        [`${this.prefix}/+/telemetry`, `${this.prefix}/+/status`, `${this.prefix}/+/relay/state`],
        { qos: 1 },
      );
    });
    this.client.on('reconnect', () => this.log.warn('Reconectando ao broker...'));
    this.client.on('error', (err) => this.log.error(`Erro MQTT: ${err.message}`));

    this.client.on('message', async (topic, payload) => {
      // interruptor/{id}/telemetry | interruptor/{id}/status | interruptor/{id}/relay/state
      const parts = topic.split('/');
      if (parts.length < 3 || parts[0] !== this.prefix) return;
      const deviceId = parts[1];
      const channel = parts.slice(2).join('/');
      for (const h of this.handlers) {
        try {
          await h(deviceId, channel, payload);
        } catch (e) {
          this.log.error(`Falha ao processar ${topic}: ${(e as Error).message}`);
        }
      }
    });
  }

  onMessage(handler: MqttHandler) {
    this.handlers.push(handler);
  }

  isConnected() {
    return this.client?.connected ?? false;
  }

  publish(deviceId: string, channel: string, payload: string, retain = false) {
    return new Promise<void>((resolve, reject) => {
      if (!this.client?.connected) return reject(new Error('Broker MQTT desconectado'));
      this.client.publish(`${this.prefix}/${deviceId}/${channel}`, payload, { qos: 1, retain }, (err) =>
        err ? reject(err) : resolve(),
      );
    });
  }

  async onModuleDestroy() {
    await this.client?.endAsync();
  }
}

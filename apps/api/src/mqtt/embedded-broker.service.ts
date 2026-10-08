import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Aedes } from 'aedes';
import { createServer, Server } from 'net';
import { timingSafeEqual } from 'crypto';
import { embeddedBrokerEnabled, embeddedBrokerPort } from './config';

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Broker MQTT dentro da própria API (aedes), ligado com MQTT_EMBEDDED_BROKER=true.
 * Evita depender de um serviço externo na demonstração: os ESP32 conectam
 * direto aqui (no Railway, pelo TCP Proxy apontando para a porta 1883).
 * Exige usuário/senha (MQTT_USERNAME / MQTT_PASSWORD) quando definidos.
 */
@Injectable()
export class EmbeddedBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(EmbeddedBrokerService.name);
  private server?: Server;
  private broker?: Aedes;
  private markReady!: () => void;
  /** Resolve quando o broker já está aceitando conexões (ou imediatamente, se desligado). */
  readonly ready = new Promise<void>((r) => (this.markReady = r));

  async onModuleInit() {
    try {
      await this.start();
    } finally {
      this.markReady();
    }
  }

  private async start() {
    if (!embeddedBrokerEnabled()) return;
    const user = process.env.MQTT_USERNAME ?? '';
    const pass = process.env.MQTT_PASSWORD ?? '';

    this.broker = await Aedes.createBroker();
    if (user || pass) {
      this.broker.authenticate = (_client, username, password, done) => {
        const ok = safeEqual(username ?? '', user) && safeEqual(password?.toString() ?? '', pass);
        if (!ok) {
          const err = Object.assign(new Error('Usuário ou senha inválidos'), { returnCode: 4 });
          return done(err as never, false);
        }
        done(null, true);
      };
    } else {
      this.log.warn('Broker embutido SEM autenticação (defina MQTT_USERNAME e MQTT_PASSWORD)');
    }

    this.broker.on('client', (c) => this.log.log(`+ cliente MQTT ${c.id}`));
    this.broker.on('clientDisconnect', (c) => this.log.log(`- cliente MQTT ${c.id}`));

    const port = embeddedBrokerPort();
    this.server = createServer(this.broker.handle);
    await new Promise<void>((resolve) => this.server!.listen(port, '0.0.0.0', resolve));
    this.log.log(`Broker MQTT embutido ouvindo na porta ${port}`);
  }

  async onModuleDestroy() {
    await new Promise<void>((r) => (this.broker ? this.broker.close(() => r()) : r()));
    await new Promise<void>((r) => (this.server ? this.server.close(() => r()) : r()));
  }
}

import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

/**
 * Empurra leituras e mudanças de estado para o navegador em tempo real.
 * Eventos emitidos: device:update, reading, event.
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()) },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly log = new Logger(RealtimeGateway.name);
  @WebSocketServer() server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error('sem token');
      await this.jwt.verifyAsync(token);
    } catch {
      this.log.warn(`Socket ${socket.id} recusado (token inválido)`);
      socket.disconnect(true);
    }
  }

  emit(event: 'device:update' | 'reading' | 'event', data: unknown) {
    this.server?.emit(event, data);
  }
}

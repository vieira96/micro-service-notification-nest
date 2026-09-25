import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Server, Socket } from 'socket.io';

function roomFor(userId: string): string {
  return `user:${userId}`;
}

@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:4200').split(','),
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly issuer = process.env.JWT_ISSUER ?? 'library-api';
  private readonly audience = process.env.JWT_AUDIENCE ?? 'library-services';
  private readonly jwks = createRemoteJWKSet(
    new URL(
      process.env.JWT_JWKS_URI ?? 'http://localhost:8000/.well-known/jwks.json',
    ),
  );

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.verifyToken(client.handshake.auth?.token);
      await client.join(roomFor(userId));
      this.logger.log(`Realtime conectado: userId=${userId}`);
    } catch {
      this.logger.warn('Realtime recusado: token inválido ou ausente.');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Realtime desconectado: socket=${client.id}`);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown): void {
    if (userIds.length === 0) {
      return;
    }
    this.server.to(userIds.map(roomFor)).emit(event, payload);
  }

  private async verifyToken(token: unknown): Promise<string> {
    if (typeof token !== 'string' || !token) {
      throw new Error('Token ausente.');
    }
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ['RS256'],
    });
    if (!payload.sub) {
      throw new Error('Token sem subject.');
    }
    return payload.sub;
  }
}

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket.service';

/**
 * Real-time gateway. Clients connect with a JWT in the handshake:
 *   io.connect(url, { auth: { token } })
 *
 * Each authenticated socket joins a personal room `user:<id>` so services can
 * target notifications/events at a single user via SocketService.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly socketService: SocketService,
  ) {}

  afterInit(server: Server) {
    this.socketService.setServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.slice(7)
          : undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const secret =
        this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
      const payload = this.jwt.verify<{ sub: string }>(token, { secret });
      const userId = payload.sub;
      client.data.userId = userId;
      await client.join(`user:${userId}`);
      this.logger.log(`Socket connected: user ${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }
}

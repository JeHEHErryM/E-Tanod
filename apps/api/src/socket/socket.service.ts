import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

type EventPayload = Record<string, unknown>;

@Injectable()
export class SocketService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: EventPayload) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: EventPayload) {
    this.server?.to(room).emit(event, payload);
  }

  emitPublic(event: string, payload: EventPayload) {
    this.server?.emit(event, payload);
  }
}

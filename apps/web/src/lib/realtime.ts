import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

/**
 * Establish (or reuse) the authenticated Socket.IO connection. The access
 * token is sent in the handshake so the gateway can join the socket to the
 * user's personal, barangay and role rooms.
 */
export function connectRealtime(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });
  return socket;
}

export function disconnectRealtime(): void {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

export function getRealtimeSocket(): Socket | null {
  return socket;
}

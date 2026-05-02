// Singleton Socket.IO client
import { io } from 'socket.io-client';
import { api } from './client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(api.baseUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

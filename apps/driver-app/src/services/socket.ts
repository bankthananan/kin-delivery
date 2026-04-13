import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = 'http://localhost:3000/tracking';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onOrderPing(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('order_ping', callback);
  }

  offOrderPing(callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off('order_ping', callback);
    } else {
      this.socket.off('order_ping');
    }
  }

  emitLocation(lat: number, lng: number) {
    if (!this.socket) return;
    this.socket.emit('driver_location_update', { lat, lng });
  }
}

export const socketService = new SocketService();

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

export const initializeSocket = () => {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  if (!socket) {
    socket = io(`${API_BASE_URL}/tracking`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { getBaseURL } from './axiosClient';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = getBaseURL().replace('/api/v1', '');
    
    console.log(`[Driver Socket] Connecting to ${socketUrl}...`);
    socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: (cb) => {
        SecureStore.getItemAsync('token')
          .then((token) => cb({ token: token || '' }))
          .catch(() => cb({ token: '' }));
      },
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  SecureStore.getItemAsync('token').then((token) => {
    if (token) {
      s.auth = { token };
    }
    if (!s.connected) {
      s.connect();
    }
  }).catch(() => {
    if (!s.connected) {
      s.connect();
    }
  });
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

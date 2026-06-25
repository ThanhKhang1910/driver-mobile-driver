import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const hostUri = Constants.expoConfig?.hostUri;
    const localhost = hostUri ? hostUri.split(':')[0] : 'localhost';
    
    // Kết nối đến port 5005 của backend
    const socketUrl = `http://${localhost}:5005`;
    
    console.log(`[Socket] Connecting to ${socketUrl}...`);
    socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

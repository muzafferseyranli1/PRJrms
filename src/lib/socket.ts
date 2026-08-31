import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const activeToken = token || localStorage.getItem('prjrms_token') || '';
    socket = io(process.env.NEXT_PUBLIC_APP_URL || '', {
      auth: { token: activeToken },
      query: { token: activeToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket!;
};

export const resetSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

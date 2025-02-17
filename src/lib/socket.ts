import { io, Socket } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextResponse } from 'next/server';

let socket: Socket | null = null;

export type NextApiResponseWithSocket = NextResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const initSocket = () => {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    socket = io(url, {
      path: '/api/socketio',
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
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

export function getSocketIO(response: NextResponse): SocketIOServer | null {
  const res = response as NextApiResponseWithSocket;
  if (res?.socket?.server?.io) {
    return res.socket.server.io;
  }
  return null;
}
import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';

let io: SocketIOServer;

export async function GET() {
  if (!io) {
    console.log('Initializing Socket.io server...');
    
    io = new SocketIOServer({
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join', (userId) => {
        socket.join(userId);
        console.log('User joined room:', userId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  return new NextResponse(null, { status: 200 });
}
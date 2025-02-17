import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';
import { Server as NetServer } from 'http';
import { NextApiResponseWithSocket } from '@/lib/socket';

export async function GET(req: Request, res: NextResponse) {
  if (!(res as NextApiResponseWithSocket)?.socket?.server?.io) {
    console.log('Initializing Socket.io server...');
    
    const httpServer: NetServer = (res as NextApiResponseWithSocket).socket.server;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    (res as NextApiResponseWithSocket).socket.server.io = io;

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

  return NextResponse.json({ success: true });
}
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initializeSocket(httpServer: HttpServer, allowedOrigins: string[]) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);

    // Student joins their session room
    socket.on('student:join-room', ({ sessionId, studentId }) => {
      socket.join(`session:${sessionId}`);
      socket.join(`student:${studentId}`);
      console.log(`Student ${studentId} joined session ${sessionId}`);
    });

    // Teacher joins their sessions
    socket.on('teacher:join-room', ({ sessionId }) => {
      socket.join(`session:${sessionId}:teacher`);
      console.log(`[Socket] Teacher joined room: session:${sessionId}:teacher`);
    });

    // Teacher joins their global notification room (receives events from ALL their sessions)
    socket.on('teacher:join-global', ({ teacherId }) => {
      socket.join(`teacher:${teacherId}`);
      console.log(`[Socket] Teacher joined global room: teacher:${teacherId}`);
    });

    // Teacher leaves a session room (when switching tasks)
    socket.on('teacher:leave-room', ({ sessionId }) => {
      const room = `session:${sessionId}:teacher`;
      socket.leave(room);
      console.log(`[Socket] Teacher left room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

// Emit to specific student
export function emitToStudent(studentId: string, event: string, data: any) {
  console.log(`[Socket] Emitting '${event}' to student:${studentId}`, data);
  io?.to(`student:${studentId}`).emit(event, data);
}

// Emit to session teachers
export function emitToSessionTeacher(sessionId: string, event: string, data: any) {
  console.log(`[Socket] Emitting '${event}' to session:${sessionId}:teacher`, data);
  io?.to(`session:${sessionId}:teacher`).emit(event, data);
}

// Emit to entire session (all students)
export function emitToSession(sessionId: string, event: string, data: any) {
  console.log(`[Socket] Emitting '${event}' to session:${sessionId}`, data);
  io?.to(`session:${sessionId}`).emit(event, data);
}

// Emit to teacher's global notification room (for events across all their sessions)
export function emitToTeacher(teacherId: string, event: string, data: any) {
  console.log(`[Socket] Emitting '${event}' to teacher:${teacherId}`, data);
  io?.to(`teacher:${teacherId}`).emit(event, data);
}

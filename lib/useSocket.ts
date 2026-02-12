// React hook for WebSocket events
import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from './socket';
import { FeedbackSession } from '../types';

export interface FeedbackReadyPayload {
  studentId: string;
  feedback: FeedbackSession;
  status: string;
}

export function useStudentSocket(
  sessionId: string | null,
  studentId: string | null,
  onFeedbackReady: (payload: FeedbackReadyPayload) => void
) {
  // Use ref to track the callback to avoid reconnecting on callback changes
  const callbackRef = useRef(onFeedbackReady);
  callbackRef.current = onFeedbackReady;

  useEffect(() => {
    if (!sessionId || !studentId) return;

    const socket = connectSocket();

    // Join room
    socket.emit('student:join-room', { sessionId, studentId });

    // Listen for feedback
    const handleFeedbackReady = (payload: FeedbackReadyPayload) => {
      console.log('[StudentSocket] Received feedback-ready:', payload);
      callbackRef.current(payload);
    };

    socket.on('feedback-ready', handleFeedbackReady);

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected, rejoining room');
      socket.emit('student:join-room', { sessionId, studentId });
    });

    return () => {
      socket.off('feedback-ready', handleFeedbackReady);
      socket.off('connect');
      disconnectSocket();
    };
  }, [sessionId, studentId]);
}

export interface StudentSubmittedPayload {
  studentId: string;
  studentName: string;
  timestamp: number;
}

export interface StudentJoinedPayload {
  studentId: string;
  studentName: string;
  timestamp: number;
}

// Global student joined payload includes session and task info
export interface GlobalStudentJoinedPayload {
  sessionId: string;
  taskId: string;
  studentId: string;
  studentName: string;
  timestamp: number;
}

export function useTeacherSocket(
  sessionId: string | null,
  onStudentSubmitted?: (payload: StudentSubmittedPayload) => void,
  onStudentJoined?: (payload: StudentJoinedPayload) => void
) {
  // Use refs to track the callbacks to avoid reconnecting on callback changes
  const submittedCallbackRef = useRef(onStudentSubmitted);
  submittedCallbackRef.current = onStudentSubmitted;

  const joinedCallbackRef = useRef(onStudentJoined);
  joinedCallbackRef.current = onStudentJoined;

  useEffect(() => {
    if (!sessionId) return;

    const socket = connectSocket();

    // Join teacher room
    socket.emit('teacher:join-room', { sessionId });

    // Listen for student submissions
    const handleStudentSubmitted = (payload: StudentSubmittedPayload) => {
      console.log('[TeacherSocket] Received student-submitted:', payload);
      submittedCallbackRef.current?.(payload);
    };

    // Listen for student joins
    const handleStudentJoined = (payload: StudentJoinedPayload) => {
      console.log('[TeacherSocket] Received student-joined:', payload);
      joinedCallbackRef.current?.(payload);
    };

    socket.on('student-submitted', handleStudentSubmitted);
    socket.on('student-joined', handleStudentJoined);

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected, rejoining teacher room');
      socket.emit('teacher:join-room', { sessionId });
    });

    return () => {
      // Leave the current room instead of disconnecting socket entirely
      // This prevents glitching when switching between tasks
      socket.emit('teacher:leave-room', { sessionId });
      socket.off('student-submitted', handleStudentSubmitted);
      socket.off('student-joined', handleStudentJoined);
      socket.off('connect');
      // Don't call disconnectSocket() - keep socket alive for room switching
    };
  }, [sessionId]);
}

// Hook for teacher to receive global notifications across ALL their sessions
// This solves the chicken-and-egg problem where liveSessionId doesn't exist until a student joins
export function useTeacherGlobalSocket(
  teacherId: string | null,
  onStudentJoined?: (payload: GlobalStudentJoinedPayload) => void
) {
  // Use ref to track the callback to avoid reconnecting on callback changes
  const joinedCallbackRef = useRef(onStudentJoined);
  joinedCallbackRef.current = onStudentJoined;

  useEffect(() => {
    if (!teacherId) return;

    const socket = connectSocket();

    // Join teacher's global room
    socket.emit('teacher:join-global', { teacherId });

    // Listen for student joins across all sessions
    const handleStudentJoined = (payload: GlobalStudentJoinedPayload) => {
      // Only handle if this has sessionId (global format)
      if (payload.sessionId && payload.taskId) {
        console.log('[TeacherGlobalSocket] Received student-joined:', payload);
        joinedCallbackRef.current?.(payload);
      }
    };

    socket.on('student-joined', handleStudentJoined);

    // Rejoin on reconnect
    socket.on('connect', () => {
      console.log('Socket connected, rejoining teacher global room');
      socket.emit('teacher:join-global', { teacherId });
    });

    return () => {
      socket.off('student-joined', handleStudentJoined);
      socket.off('connect');
      // Don't disconnect - other hooks may be using the socket
    };
  }, [teacherId]);
}

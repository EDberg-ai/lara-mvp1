import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import prisma from '../lib/prisma';

// JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

// Fail fast in production if JWT_SECRET is not properly configured
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

export interface JWTPayload {
  teacherId?: string;
  studentId?: string;
  sessionId?: string;
  type: 'teacher' | 'student';
}

export const authenticateTeacher = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (decoded.type !== 'teacher' || !decoded.teacherId) {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.teacherId },
    });

    if (!teacher) {
      return res.status(401).json({ error: 'Teacher not found' });
    }

    req.teacher = {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      tier: teacher.tier,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (decoded.type !== 'student' || !decoded.studentId || !decoded.sessionId) {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.student = {
      id: decoded.studentId,
      sessionId: decoded.sessionId,
      name: '', // Will be loaded from Redis if needed
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const generateTeacherToken = (teacherId: string): string => {
  return jwt.sign(
    { teacherId, type: 'teacher' } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const generateStudentToken = (studentId: string, sessionId: string): string => {
  return jwt.sign(
    { studentId, sessionId, type: 'student' } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

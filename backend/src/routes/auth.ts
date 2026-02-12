import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import redis, { requireRedis, sessionKeys, SESSION_TTL } from '../lib/redis';
import { generateTeacherToken, generateStudentToken, authenticateTeacher } from '../middleware/auth';
import { AuthenticatedRequest, StudentSessionData } from '../types';
import { emitToSessionTeacher, emitToTeacher } from '../lib/socket';

const router = Router();

// Generate unique task code
function generateTaskCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 3) + code.slice(3);
}

// Create onboarding demo task for new teachers
async function createOnboardingDemo(teacherId: string) {
  try {
    // 1. Create "Getting Started" folder
    const folder = await prisma.folder.create({
      data: {
        teacherId,
        name: 'Getting Started',
        description: 'Sample tasks to help you learn LARA',
        color: '#6bb7e4', // Brand blue
      },
    });

    // 2. Generate unique task code
    let taskCode = generateTaskCode();
    while (await prisma.task.findUnique({ where: { taskCode } })) {
      taskCode = generateTaskCode();
    }

    // 3. Create "Sample Writing Task"
    const task = await prisma.task.create({
      data: {
        teacherId,
        title: 'Sample Writing Task',
        prompt: 'Write a short paragraph about what you hope to learn this year.',
        taskCode,
        successCriteria: ['Clear main idea', 'Supporting details', 'Proper grammar and spelling'],
        universalExpectations: true,
        status: 'active',
        folderId: folder.id,
      },
    });

    // 4. Create live session for the task
    const session = await prisma.taskSession.create({
      data: {
        taskId: task.id,
        teacherId,
        isLive: true,
        startedAt: new Date(),
        dataExpiresAt: new Date(Date.now() + SESSION_TTL * 1000),
        dataPersisted: true, // Keep demo data persistent
        totalStudents: 3,
      },
    });

    // 5. Create 3 demo students in Postgres (since dataPersisted is true)
    const emmaId = uuidv4();
    const jamesId = uuidv4();
    const sofiaId = uuidv4();

    await prisma.student.createMany({
      data: [
        { id: emmaId, sessionId: session.id, name: 'Emma S.', status: 'feedback_ready' },
        { id: jamesId, sessionId: session.id, name: 'James T.', status: 'ready_for_feedback' },
        { id: sofiaId, sessionId: session.id, name: 'Sofia M.', status: 'active' },
      ],
    });

    // 6. Create submissions for Emma and James
    const emmaSubmission = await prisma.studentSubmission.create({
      data: {
        studentId: emmaId,
        sessionId: session.id,
        content: 'This year, I hope to learn how to write better essays. I want to improve my vocabulary and learn how to organise my thoughts more clearly. I also want to read more books so I can understand different writing styles.',
        feedbackStatus: 'released',
        validationWarnings: [],
      },
    });

    await prisma.studentSubmission.create({
      data: {
        studentId: jamesId,
        sessionId: session.id,
        content: 'I want to learn math because its important for my future. I also want to get better at science experiments.',
        feedbackStatus: 'pending',
        validationWarnings: [],
      },
    });

    // 7. Create feedback for Emma's submission
    await prisma.submissionFeedback.create({
      data: {
        submissionId: emmaSubmission.id,
        goal: 'Write a clear paragraph with supporting details',
        masteryAchieved: true,
        strengths: [
          { id: '1', type: 'task', text: 'You clearly stated your main goal for the year', anchors: [] },
          { id: '2', type: 'process', text: 'You organised your thoughts into logical points', anchors: [] },
        ],
        growthAreas: [
          { id: '1', type: 'task', text: 'Consider adding specific examples of books or writing styles', anchors: [] },
        ],
        nextSteps: [
          { id: '1', actionVerb: 'List', target: '2-3 specific books you\'d like to read', successIndicator: 'Names 2-3 titles', ctaText: 'Add book examples', actionType: 'improve_section' },
          { id: '2', actionVerb: 'Describe', target: 'what "better essays" means to you', successIndicator: 'Explains specific essay skills', ctaText: 'Clarify your goals', actionType: 'improve_section' },
        ],
        approvedBy: teacherId,
        approvedAt: new Date(),
      },
    });

    // 8. Also add students to Redis for live session
    const redisClient = redis;
    if (redisClient) {
      const studentDataEmma: StudentSessionData = {
        id: emmaId,
        name: 'Emma S.',
        joinedAt: Date.now() - 300000, // 5 min ago
        status: 'feedback_ready',
      };
      const studentDataJames: StudentSessionData = {
        id: jamesId,
        name: 'James T.',
        joinedAt: Date.now() - 180000, // 3 min ago
        status: 'ready_for_feedback',
      };
      const studentDataSofia: StudentSessionData = {
        id: sofiaId,
        name: 'Sofia M.',
        joinedAt: Date.now() - 60000, // 1 min ago
        status: 'active',
      };

      await redisClient.hset(sessionKeys.students(session.id), emmaId, JSON.stringify(studentDataEmma));
      await redisClient.hset(sessionKeys.students(session.id), jamesId, JSON.stringify(studentDataJames));
      await redisClient.hset(sessionKeys.students(session.id), sofiaId, JSON.stringify(studentDataSofia));
      await redisClient.expire(sessionKeys.students(session.id), SESSION_TTL);

      // Add Emma's submission to Redis
      const emmaSubmissionData = {
        studentId: emmaId,
        content: 'This year, I hope to learn how to write better essays. I want to improve my vocabulary and learn how to organise my thoughts more clearly. I also want to read more books so I can understand different writing styles.',
        timestamp: Date.now() - 240000,
        revisionCount: 0,
        feedbackStatus: 'released',
        validationWarnings: [],
        isRevision: false,
        feedback: {
          goal: 'Write a clear paragraph with supporting details',
          masteryAchieved: true,
          strengths: [
            { id: '1', type: 'task', text: 'You clearly stated your main goal for the year', anchors: [] },
            { id: '2', type: 'process', text: 'You organised your thoughts into logical points', anchors: [] },
          ],
          growthAreas: [
            { id: '1', type: 'task', text: 'Consider adding specific examples of books or writing styles', anchors: [] },
          ],
          nextSteps: [
            { id: '1', actionVerb: 'List', target: '2-3 specific books you\'d like to read', successIndicator: 'Names 2-3 titles', ctaText: 'Add book examples', actionType: 'improve_section' },
            { id: '2', actionVerb: 'Describe', target: 'what "better essays" means to you', successIndicator: 'Explains specific essay skills', ctaText: 'Clarify your goals', actionType: 'improve_section' },
          ],
        },
      };
      await redisClient.set(sessionKeys.submission(session.id, emmaId), JSON.stringify(emmaSubmissionData), 'EX', SESSION_TTL);

      // Add James's submission to Redis (no feedback yet)
      const jamesSubmissionData = {
        studentId: jamesId,
        content: 'I want to learn math because its important for my future. I also want to get better at science experiments.',
        timestamp: Date.now() - 120000,
        revisionCount: 0,
        feedbackStatus: 'pending',
        validationWarnings: [],
        isRevision: false,
      };
      await redisClient.set(sessionKeys.submission(session.id, jamesId), JSON.stringify(jamesSubmissionData), 'EX', SESSION_TTL);
    }

    console.log(`Created onboarding demo for teacher ${teacherId}: folder=${folder.id}, task=${task.id}, session=${session.id}`);
  } catch (error) {
    // Don't fail registration if demo creation fails
    console.error('Failed to create onboarding demo:', error);
  }
}

// Teacher Registration (simplified for MVP - no OAuth yet)
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if teacher already exists
    const existing = await prisma.teacher.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await prisma.teacher.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword, // Proper password storage
        tier: 'classroom', // Default to classroom tier for pilot
      },
    });

    // Create onboarding demo task for new teacher
    // await createOnboardingDemo(teacher.id);

    const token = generateTeacherToken(teacher.id);

    return res.json({
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        tier: teacher.tier,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register' });
  }
});

// Teacher Login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (!teacher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check passwordHash first (new), then schoolId (legacy) for backward compatibility
    const passwordToCheck = teacher.passwordHash || teacher.schoolId;
    if (!passwordToCheck) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, passwordToCheck);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If still using legacy schoolId, migrate to passwordHash
    if (!teacher.passwordHash && teacher.schoolId) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          passwordHash: teacher.schoolId,
          schoolId: null, // Clear legacy field
        },
      });
    }

    const token = generateTeacherToken(teacher.id);

    return res.json({
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        tier: teacher.tier,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current teacher profile
router.get('/me', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.teacher!.id },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        aiCallsUsed: true,
        aiCallsReset: true,
        createdAt: true,
        onboardingCompleted: true,
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const { TIER_CONFIGS } = await import('../types');
    const tierConfig = TIER_CONFIGS[teacher.tier] || TIER_CONFIGS.starter;

    return res.json({
      ...teacher,
      aiCallsLimit: tierConfig.monthlyAiCalls,
      aiCallsRemaining: Math.max(0, tierConfig.monthlyAiCalls - teacher.aiCallsUsed),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update teacher profile (name)
router.patch('/me', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const teacher = await prisma.teacher.update({
      where: { id: req.teacher!.id },
      data: { name: name.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
      },
    });

    return res.json({ success: true, teacher });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Mark onboarding as completed
router.post('/onboarding/complete', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.teacher.update({
      where: { id: req.teacher!.id },
      data: { onboardingCompleted: true },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Change password
router.post('/change-password', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get teacher with password hash
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.teacher!.id },
      select: { passwordHash: true, schoolId: true },
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Check current password (check passwordHash first, then legacy schoolId)
    const passwordToCheck = teacher.passwordHash || teacher.schoolId;
    if (!passwordToCheck) {
      return res.status(400).json({ error: 'Cannot change password - no password set' });
    }

    const validPassword = await bcrypt.compare(currentPassword, passwordToCheck);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.teacher.update({
      where: { id: req.teacher!.id },
      data: {
        passwordHash: hashedPassword,
        schoolId: null, // Clear legacy field if present
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// Validate task code without revealing task details (Kahoot-style)
router.post('/validate-code', async (req, res: Response) => {
  try {
    const { taskCode } = req.body;

    if (!taskCode) {
      return res.status(400).json({ error: 'Task code is required' });
    }

    // Normalize the task code: uppercase and remove all hyphens/spaces
    const normalizedCode = taskCode.toUpperCase().replace(/[-\s]/g, '');

    // Find the task by code
    const task = await prisma.task.findUnique({
      where: { taskCode: normalizedCode },
      select: { id: true, title: true, status: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Invalid code. Please check and try again.' });
    }

    if (task.status !== 'active') {
      return res.status(403).json({ error: 'This task is not currently active.' });
    }

    // Return minimal info - just that the code is valid and the task title
    return res.json({
      valid: true,
      taskTitle: task.title,
    });
  } catch (error: any) {
    console.error('Validate code error:', error);
    // Check for database connection errors
    if (error?.code === 'P1001' || error?.code === 'P1002' || error?.message?.includes('ECONNRESET')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to validate code' });
  }
});

// Student joins via task code
router.post('/session/join', async (req, res: Response) => {
  try {
    const { taskCode, studentName } = req.body;

    if (!taskCode || !studentName) {
      return res.status(400).json({ error: 'Task code and student name are required' });
    }

    // Normalize and find the task by code
    const normalizedCode = taskCode.toUpperCase().replace(/[-\s]/g, '');
    const task = await prisma.task.findUnique({
      where: { taskCode: normalizedCode },
      include: { teacher: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'active') {
      return res.status(403).json({ error: 'Task is not active' });
    }

    // Find or create a live session for this task
    let session = await prisma.taskSession.findFirst({
      where: {
        taskId: task.id,
        isLive: true,
      },
    });

    if (!session) {
      // Create a new session
      session = await prisma.taskSession.create({
        data: {
          taskId: task.id,
          teacherId: task.teacherId,
          isLive: true,
          startedAt: new Date(),
          dataExpiresAt: new Date(Date.now() + SESSION_TTL * 1000), // 16 hours from now
        },
      });
    }

    // Create student ID
    const studentId = uuidv4();

    // Require Redis for live session operations (Redis is the source of truth for student data)
    const redisClient = requireRedis();

    // Write student to Redis (source of truth for student data)
    const studentData: StudentSessionData = {
      id: studentId,
      name: studentName,
      joinedAt: Date.now(),
      status: 'active',
    };

    await redisClient.hset(
      sessionKeys.students(session.id),
      studentId,
      JSON.stringify(studentData)
    );
    await redisClient.expire(sessionKeys.students(session.id), SESSION_TTL);

    // Update session counter in Postgres (analytics only)
    await prisma.taskSession.update({
      where: { id: session.id },
      data: { totalStudents: { increment: 1 } },
    });

    // If session has persistence enabled, also write to Postgres
    if (session.dataPersisted) {
      await prisma.student.create({
        data: {
          id: studentId,
          sessionId: session.id,
          name: studentName,
          status: 'active',
        },
      });
    }

    // Emit WebSocket event to notify teacher that a student joined (AFTER successful Redis write)
    // Emit to session-specific room (for teachers already viewing this session)
    emitToSessionTeacher(session.id, 'student-joined', {
      studentId,
      studentName,
      timestamp: Date.now(),
    });

    // Also emit to teacher's global notification room (for when teacher doesn't have liveSessionId yet)
    emitToTeacher(task.teacherId, 'student-joined', {
      sessionId: session.id,
      taskId: task.id,
      studentId,
      studentName,
      timestamp: Date.now(),
    });

    // Generate student token
    const token = generateStudentToken(studentId, session.id);

    return res.json({
      token,
      studentId,
      sessionId: session.id,
      task: {
        id: task.id,
        title: task.title,
        prompt: task.prompt,
        successCriteria: task.successCriteria,
        imageUrl: task.imageUrl,
        fileType: task.fileType,
      },
    });
  } catch (error) {
    console.error('Session join error:', error);
    return res.status(500).json({ error: 'Failed to join session' });
  }
});

// Student restores session by studentId (for returning students)
router.get('/session/restore/:studentId', async (req, res: Response) => {
  try {
    const studentId = req.params.studentId;

    // Find the student with their session and task info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        session: {
          include: {
            task: true,
          },
        },
        submissions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          include: { feedback: true },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const session = student.session;
    const task = session.task;
    const latestSubmission = student.submissions[0];

    // Generate a new token for this student
    const token = generateStudentToken(student.id, session.id);

    // Prepare feedback if available and released
    let feedback = null;
    let feedbackReady = false;
    if (latestSubmission?.feedbackStatus === 'released' && latestSubmission.feedback) {
      feedbackReady = true;
      feedback = {
        goal: latestSubmission.feedback.goal,
        masteryAchieved: latestSubmission.feedback.masteryAchieved,
        strengths: latestSubmission.feedback.strengths,
        growthAreas: latestSubmission.feedback.growthAreas,
        nextSteps: latestSubmission.feedback.nextSteps,
      };
    }

    return res.json({
      token,
      studentId: student.id,
      studentName: student.name,
      sessionId: session.id,
      status: student.status,
      task: {
        id: task.id,
        title: task.title,
        prompt: task.prompt,
        successCriteria: task.successCriteria,
        status: task.status,
        imageUrl: task.imageUrl,
        fileType: task.fileType,
      },
      feedbackReady,
      feedback,
      submission: latestSubmission ? {
        content: latestSubmission.content,
        timestamp: latestSubmission.timestamp.getTime(),
      } : null,
    });
  } catch (error) {
    console.error('Session restore error:', error);
    return res.status(500).json({ error: 'Failed to restore session' });
  }
});

export default router;

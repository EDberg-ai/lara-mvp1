import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireRedis, sessionKeys, SESSION_TTL } from '../lib/redis';
import { authenticateTeacher, authenticateStudent } from '../middleware/auth';
import { generateFeedback, logAiUsage, checkTeacherQuota, detectRevisionAlignment } from '../services/feedback';
import { AuthenticatedRequest, StudentSessionData, StudentSubmission } from '../types';
import { emitToStudent, emitToSessionTeacher } from '../lib/socket';

const router = Router();

// Universal Learning Expectations - LARA standard criteria
const UNIVERSAL_LEARNING_EXPECTATIONS = [
  "Clarity of response - Is the answer clear and easy to understand?",
  "Use of evidence and/or examples - Does the response include relevant evidence or examples?",
  "Reasoning and explanation - Is the thinking process explained?",
  "Organisation - Is the response well-structured?",
  "Language for audience and purpose - Is the language appropriate?"
];

// Get session dashboard (teacher)
router.get('/:sessionId/dashboard', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await prisma.taskSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.teacher!.id,
      },
      include: {
        task: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let students: (StudentSessionData & { submission?: StudentSubmission })[] = [];
    let dataSource: 'redis' | 'postgres' = 'redis';

    // For live sessions: Redis is required (source of truth)
    // For historical sessions: Fall back to Postgres
    if (session.isLive) {
      const redisClient = requireRedis();
      const studentData = await redisClient.hgetall(sessionKeys.students(session.id));

      for (const [studentId, data] of Object.entries(studentData)) {
        const student = JSON.parse(data) as StudentSessionData;

        // Get submission if exists
        const submissionData = await redisClient.get(sessionKeys.submission(session.id, studentId));
        const submission = submissionData ? JSON.parse(submissionData) as StudentSubmission : undefined;

        students.push({ ...student, submission });
      }
    } else {
      // Historical session - can use Postgres (for backwards compatibility with old data)
      dataSource = 'postgres';
      const pgStudents = await prisma.student.findMany({
        where: { sessionId: session.id },
        include: {
          submissions: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            include: { feedback: true },
          },
        },
      });

      students = pgStudents.map(s => {
        const latestSubmission = s.submissions[0];
        const submission: StudentSubmission | undefined = latestSubmission ? {
          studentId: s.id,
          content: latestSubmission.content,
          timestamp: latestSubmission.timestamp.getTime(),
          timeElapsed: latestSubmission.timeElapsed || undefined,
          revisionCount: latestSubmission.revisionCount,
          previousContent: latestSubmission.previousContent || undefined,
          feedbackStatus: latestSubmission.feedbackStatus as 'pending' | 'generated' | 'approved' | 'released',
          validationWarnings: latestSubmission.validationWarnings,
          isRevision: latestSubmission.isRevision,
          feedback: latestSubmission.feedback ? {
            goal: latestSubmission.feedback.goal,
            masteryAchieved: latestSubmission.feedback.masteryAchieved,
            strengths: latestSubmission.feedback.strengths as any[],
            growthAreas: latestSubmission.feedback.growthAreas as any[],
            nextSteps: latestSubmission.feedback.nextSteps as any[],
          } : undefined,
        } : undefined;

        return {
          id: s.id,
          name: s.name,
          joinedAt: s.joinedAt.getTime(),
          status: s.status as StudentSessionData['status'],
          submission,
        };
      });
    }

    // Get usage stats
    const quota = await checkTeacherQuota(req.teacher!.id);

    // Calculate stats
    const stats = {
      total: students.length,
      writing: students.filter(s => s.status === 'active').length,
      readyForFeedback: students.filter(s => s.status === 'ready_for_feedback').length,
      generating: students.filter(s => s.status === 'generating').length,
      submitted: students.filter(s => s.status === 'submitted').length,
      feedbackReady: students.filter(s => s.status === 'feedback_ready').length,
      revising: students.filter(s => s.status === 'revising').length,
      completed: students.filter(s => s.status === 'completed').length,
    };

    return res.json({
      session: {
        id: session.id,
        taskId: session.taskId,
        task: session.task,
        startedAt: session.startedAt,
        isLive: session.isLive,
        status: session.status,
        classIdentifier: session.classIdentifier,
        dataPersisted: session.dataPersisted,
        dataExpiresAt: session.dataExpiresAt?.toISOString() || null,
      },
      students,
      stats,
      usage: quota,
      sessionUsage: {
        feedbacksGenerated: session.feedbacksGenerated || 0,
      },
      dataSource, // Indicate where data came from for debugging
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// Student submits work
router.post('/:sessionId/submit', authenticateStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, timeElapsed } = req.body;
    const studentId = req.student!.id;
    const sessionId = req.params.sessionId as string;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (sessionId !== req.student!.sessionId) {
      return res.status(403).json({ error: 'Session mismatch' });
    }

    // Get session to check persistence status
    const session = await prisma.taskSession.findUnique({
      where: { id: sessionId },
      select: { dataPersisted: true },
    });

    // Require Redis for live session operations
    const redisClient = requireRedis();

    // Get existing submission for revision count from Redis
    const existingSubmissionData = await redisClient.get(sessionKeys.submission(sessionId, studentId));
    const existingSubmission = existingSubmissionData ? JSON.parse(existingSubmissionData) as StudentSubmission : null;
    const revisionCount = existingSubmission ? (existingSubmission.revisionCount || 0) + 1 : 0;

    // Get student data from Redis
    const studentData = await redisClient.hget(sessionKeys.students(sessionId), studentId);
    if (!studentData) {
      return res.status(404).json({ error: 'Student not found in session' });
    }
    const student = JSON.parse(studentData) as StudentSessionData;

    // Detect revision alignment if this is a revision with a selected next step
    let detectionResult: 'aligned' | 'uncertain' | undefined;
    if (revisionCount > 0 && existingSubmission?.content && existingSubmission?.selectedNextStepId && existingSubmission?.feedback?.nextSteps) {
      const selectedNextStep = existingSubmission.feedback.nextSteps.find(
        (step: any) => step.id === existingSubmission.selectedNextStepId
      );
      if (selectedNextStep) {
        detectionResult = await detectRevisionAlignment(
          existingSubmission.content,
          content,
          {
            actionVerb: selectedNextStep.actionVerb,
            target: selectedNextStep.target,
            successIndicator: selectedNextStep.successIndicator,
          }
        );
      }
    }

    // Write submission to Redis (source of truth)
    const submission: StudentSubmission = {
      studentId,
      content,
      timestamp: Date.now(),
      timeElapsed,
      revisionCount,
      previousContent: existingSubmission?.content,
      feedbackStatus: 'pending',
      validationWarnings: [],
      isRevision: revisionCount > 0,
      detectionResult,
    };

    await redisClient.set(
      sessionKeys.submission(sessionId, studentId),
      JSON.stringify(submission),
      'EX',
      SESSION_TTL
    );

    // Update student status in Redis
    student.status = 'ready_for_feedback';
    await redisClient.hset(sessionKeys.students(sessionId), studentId, JSON.stringify(student));

    // Update session submission count in Postgres (analytics only)
    await prisma.taskSession.update({
      where: { id: sessionId },
      data: { submissions: { increment: 1 } },
    });

    // If session has persistence enabled, also write to Postgres
    if (session?.dataPersisted) {
      await prisma.$transaction(async (tx) => {
        // Update student status
        await tx.student.update({
          where: { id: studentId },
          data: { status: 'ready_for_feedback' },
        });

        // Create submission
        await tx.studentSubmission.create({
          data: {
            studentId,
            sessionId,
            content,
            previousContent: existingSubmission?.content,
            timeElapsed,
            revisionCount,
            isRevision: revisionCount > 0,
            feedbackStatus: 'pending',
            validationWarnings: [],
            detectionResult: detectionResult || null,
          },
        });
      });
    }

    // Emit WebSocket event to notify teacher of new submission (AFTER successful Redis write)
    emitToSessionTeacher(sessionId, 'student-submitted', {
      studentId,
      studentName: student.name,
      timestamp: Date.now(),
    });

    return res.json({
      status: 'ready_for_feedback',
      message: 'Submission received. Your teacher will prepare your feedback shortly.',
    });
  } catch (error) {
    console.error('Submit work error:', error);
    return res.status(500).json({ error: 'Failed to submit work' });
  }
});

// Teacher generates feedback (single or batch)
router.post('/:sessionId/generate-feedback', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentIds } = req.body; // If empty, generate for all ready_for_feedback
    const sessionId = req.params.sessionId as string;

    const session = await prisma.taskSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.teacher!.id,
      },
      include: { task: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Require Redis for live session operations
    const redisClient = requireRedis();

    // Get students to generate for from Redis
    let targetStudentIds: string[] = studentIds || [];

    if (targetStudentIds.length === 0) {
      const allStudents = await redisClient.hgetall(sessionKeys.students(sessionId));
      for (const [sid, data] of Object.entries(allStudents)) {
        const student = JSON.parse(data) as StudentSessionData;
        if (student.status === 'ready_for_feedback') {
          targetStudentIds.push(sid);
        }
      }
    }

    if (targetStudentIds.length === 0) {
      return res.json({ generated: 0, message: 'No students ready for feedback' });
    }

    // Check quota
    const quota = await checkTeacherQuota(req.teacher!.id);
    if (!quota.allowed || quota.remaining < targetStudentIds.length) {
      return res.status(403).json({
        error: 'Insufficient AI credits',
        required: targetStudentIds.length,
        remaining: quota.remaining,
      });
    }

    // Generate feedback for each student
    const results: { studentId: string; success: boolean; error?: string }[] = [];

    for (const studentId of targetStudentIds) {
      try {
        // Update status to generating in Redis
        const studentData = await redisClient.hget(sessionKeys.students(sessionId), studentId);
        if (!studentData) {
          results.push({ studentId, success: false, error: 'Student not found' });
          continue;
        }

        const student = JSON.parse(studentData) as StudentSessionData;
        student.status = 'generating';
        await redisClient.hset(sessionKeys.students(sessionId), studentId, JSON.stringify(student));

        // Get submission content from Redis
        const submissionData = await redisClient.get(sessionKeys.submission(sessionId, studentId));
        if (!submissionData) {
          results.push({ studentId, success: false, error: 'No submission found' });
          continue;
        }

        const submission = JSON.parse(submissionData) as StudentSubmission;

        // Determine which criteria to use - ULE or custom
        const criteriaToUse = session.task.universalExpectations
          ? UNIVERSAL_LEARNING_EXPECTATIONS
          : (session.task.successCriteria as string[]);

        // Generate feedback using AI
        const feedback = await generateFeedback(
          session.task.prompt,
          criteriaToUse,
          submission.content
        );

        // Update submission with feedback in Redis
        submission.feedback = feedback;
        submission.feedbackStatus = 'generated';
        await redisClient.set(
          sessionKeys.submission(sessionId, studentId),
          JSON.stringify(submission),
          'EX',
          SESSION_TTL
        );

        // Update student status in Redis
        student.status = 'submitted';
        await redisClient.hset(sessionKeys.students(sessionId), studentId, JSON.stringify(student));

        // Log AI usage (Postgres - for analytics)
        await logAiUsage(req.teacher!.id, 'single_feedback', 1, session.taskId, sessionId);

        // Increment session feedbacks counter (Postgres - for analytics)
        await prisma.taskSession.update({
          where: { id: sessionId },
          data: { feedbacksGenerated: { increment: 1 } },
        });

        // If session has persistence enabled, also write to Postgres
        if (session.dataPersisted) {
          const pgSubmission = await prisma.studentSubmission.findFirst({
            where: { studentId, sessionId },
            orderBy: { timestamp: 'desc' },
          });

          if (pgSubmission) {
            await prisma.$transaction(async (tx) => {
              // Update submission status
              await tx.studentSubmission.update({
                where: { id: pgSubmission.id },
                data: { feedbackStatus: 'generated' },
              });

              // Create or update feedback record
              await tx.submissionFeedback.upsert({
                where: { submissionId: pgSubmission.id },
                create: {
                  submissionId: pgSubmission.id,
                  goal: feedback.goal,
                  masteryAchieved: feedback.masteryAchieved || false,
                  strengths: JSON.parse(JSON.stringify(feedback.strengths)),
                  growthAreas: JSON.parse(JSON.stringify(feedback.growthAreas)),
                  nextSteps: JSON.parse(JSON.stringify(feedback.nextSteps)),
                },
                update: {
                  goal: feedback.goal,
                  masteryAchieved: feedback.masteryAchieved || false,
                  strengths: JSON.parse(JSON.stringify(feedback.strengths)),
                  growthAreas: JSON.parse(JSON.stringify(feedback.growthAreas)),
                  nextSteps: JSON.parse(JSON.stringify(feedback.nextSteps)),
                },
              });

              // Update student status
              await tx.student.update({
                where: { id: studentId },
                data: { status: 'submitted' },
              });
            });
          }
        }

        results.push({ studentId, success: true });
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        console.error(`Failed to generate for ${studentId}:`, errorMessage, error);

        // Revert status in Redis
        const revertData = await redisClient.hget(sessionKeys.students(sessionId), studentId);
        if (revertData) {
          const student = JSON.parse(revertData) as StudentSessionData;
          student.status = 'ready_for_feedback';
          await redisClient.hset(sessionKeys.students(sessionId), studentId, JSON.stringify(student));
        }

        results.push({ studentId, success: false, error: `Generation failed: ${errorMessage}` });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return res.json({
      generated: successCount,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Generate feedback error:', error);
    return res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

// Teacher approves feedback
router.patch('/:sessionId/feedback/:studentId/approve', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const studentId = req.params.studentId as string;
    const teacherId = req.teacher!.id;
    const approvedAt = new Date();

    const session = await prisma.taskSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.teacher!.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Require Redis for live session operations
    const redisClient = requireRedis();

    const newStatus = 'feedback_ready';

    // Update submission in Redis (source of truth)
    const submissionData = await redisClient.get(sessionKeys.submission(sessionId, studentId));
    if (!submissionData) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = JSON.parse(submissionData) as StudentSubmission;
    submission.feedbackStatus = 'released';
    // Keep feedback as-is (no mastery override)
    await redisClient.set(
      sessionKeys.submission(sessionId, studentId),
      JSON.stringify(submission),
      'EX',
      SESSION_TTL
    );

    // Update student status in Redis
    const studentData = await redisClient.hget(sessionKeys.students(sessionId), studentId);
    if (studentData) {
      const student = JSON.parse(studentData) as StudentSessionData;
      student.status = newStatus;
      await redisClient.hset(sessionKeys.students(sessionId), studentId, JSON.stringify(student));
    }

    // Update session feedback count in Postgres (analytics only)
    await prisma.taskSession.update({
      where: { id: sessionId },
      data: { feedbackSent: { increment: 1 } },
    });

    // If session has persistence enabled, also write to Postgres
    if (session.dataPersisted) {
      const pgSubmission = await prisma.studentSubmission.findFirst({
        where: { studentId, sessionId },
        orderBy: { timestamp: 'desc' },
        include: { feedback: true },
      });

      if (pgSubmission) {
        await prisma.$transaction(async (tx) => {
          // Update submission status
          await tx.studentSubmission.update({
            where: { id: pgSubmission.id },
            data: { feedbackStatus: 'released' },
          });

          // Update feedback mastery and approval tracking if exists
          if (pgSubmission.feedback) {
            await tx.submissionFeedback.update({
              where: { id: pgSubmission.feedback.id },
              data: {
                masteryAchieved: pgSubmission.feedback.masteryAchieved,
                approvedBy: teacherId,
                approvedAt: approvedAt,
              },
            });
          }

          // Update student status
          await tx.student.update({
            where: { id: studentId },
            data: { status: newStatus },
          });
        });
      }
    }

    // Emit WebSocket event to notify student that feedback is ready (AFTER successful Redis write)
    if (submission.feedback) {
      emitToStudent(studentId, 'feedback-ready', {
        studentId,
        feedback: submission.feedback,
        status: newStatus,
      });
    }

    return res.json({
      approved: true,
      releasedAt: Date.now(),
      approvedBy: teacherId,
      approvedAt: approvedAt.toISOString(),
    });
  } catch (error) {
    console.error('Approve feedback error:', error);
    return res.status(500).json({ error: 'Failed to approve feedback' });
  }
});

// Teacher edits feedback
router.patch('/:sessionId/feedback/:studentId/edit', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const studentId = req.params.studentId as string;
    const { feedback } = req.body;

    const session = await prisma.taskSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.teacher!.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Require Redis for live session operations
    const redisClient = requireRedis();

    const submissionData = await redisClient.get(sessionKeys.submission(sessionId, studentId));
    if (!submissionData) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = JSON.parse(submissionData) as StudentSubmission;
    submission.feedback = { ...submission.feedback, ...feedback };
    await redisClient.set(
      sessionKeys.submission(sessionId, studentId),
      JSON.stringify(submission),
      'EX',
      SESSION_TTL
    );

    return res.json({ updated: true, feedback: submission.feedback });
  } catch (error) {
    console.error('Edit feedback error:', error);
    return res.status(500).json({ error: 'Failed to edit feedback' });
  }
});

// Student polls for feedback
router.get('/:sessionId/feedback/:studentId', authenticateStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const studentId = req.params.studentId as string;

    if (studentId !== req.student!.id || sessionId !== req.student!.sessionId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Require Redis for live session operations
    const redisClient = requireRedis();

    // Get student status
    const studentData = await redisClient.hget(sessionKeys.students(sessionId), studentId);
    if (!studentData) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = JSON.parse(studentData) as StudentSessionData;

    // Get submission
    const submissionData = await redisClient.get(sessionKeys.submission(sessionId, studentId));
    const submission = submissionData ? JSON.parse(submissionData) as StudentSubmission : null;

    // Only return feedback if it's been released
    if (submission?.feedbackStatus === 'released' && submission.feedback) {
      return res.json({
        status: student.status,
        feedbackReady: true,
        feedback: submission.feedback,
      });
    }

    return res.json({
      status: student.status,
      feedbackReady: false,
      message: student.status === 'ready_for_feedback' || student.status === 'generating'
        ? 'Your teacher is preparing your feedback.'
        : 'Waiting for feedback.',
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    return res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Teacher usage stats
router.get('/usage', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quota = await checkTeacherQuota(req.teacher!.id);

    const teacher = await prisma.teacher.findUnique({
      where: { id: req.teacher!.id },
      select: { aiCallsReset: true },
    });

    return res.json({
      ...quota,
      resetDate: teacher?.aiCallsReset,
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return res.status(500).json({ error: 'Failed to get usage' });
  }
});

// Teacher persists session data from Redis to Postgres
router.post('/:sessionId/persist', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = await prisma.taskSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.teacher!.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.isLive) {
      return res.status(400).json({ error: 'Session is not live' });
    }

    if (session.dataPersisted) {
      return res.json({ persisted: true, message: 'Already saved' });
    }

    // Check if data has expired
    if (session.dataExpiresAt && new Date() > session.dataExpiresAt) {
      return res.status(400).json({ error: 'Session data has expired and cannot be saved' });
    }

    // Require Redis for reading live session data
    const redisClient = requireRedis();
    const studentData = await redisClient.hgetall(sessionKeys.students(sessionId));

    if (Object.keys(studentData).length === 0) {
      return res.status(400).json({ error: 'No student data to save' });
    }

    // Pre-fetch all submissions from Redis BEFORE transaction to avoid blocking
    const submissionDataMap = new Map<string, StudentSubmission>();
    for (const studentId of Object.keys(studentData)) {
      const subData = await redisClient.get(sessionKeys.submission(sessionId, studentId));
      if (subData) {
        submissionDataMap.set(studentId, JSON.parse(subData) as StudentSubmission);
      }
    }

    // Transaction: copy all Redis data to Postgres (with increased timeout)
    await prisma.$transaction(async (tx) => {
      for (const [studentId, data] of Object.entries(studentData)) {
        const student = JSON.parse(data) as StudentSessionData;

        // Upsert student
        await tx.student.upsert({
          where: { id: studentId },
          create: {
            id: studentId,
            sessionId,
            name: student.name,
            status: student.status,
            joinedAt: new Date(student.joinedAt),
          },
          update: { status: student.status },
        });

        // Use pre-fetched submission data (no Redis call inside transaction)
        const submission = submissionDataMap.get(studentId);
        if (submission) {
          const existingSub = await tx.studentSubmission.findFirst({
            where: { studentId, sessionId },
          });

          const subRecord = existingSub
            ? await tx.studentSubmission.update({
                where: { id: existingSub.id },
                data: { content: submission.content, feedbackStatus: submission.feedbackStatus },
              })
            : await tx.studentSubmission.create({
                data: {
                  studentId,
                  sessionId,
                  content: submission.content,
                  previousContent: submission.previousContent,
                  timeElapsed: submission.timeElapsed,
                  revisionCount: submission.revisionCount || 0,
                  isRevision: submission.isRevision || false,
                  feedbackStatus: submission.feedbackStatus,
                  validationWarnings: submission.validationWarnings || [],
                },
              });

          // Persist feedback if exists
          if (submission.feedback) {
            await tx.submissionFeedback.upsert({
              where: { submissionId: subRecord.id },
              create: {
                submissionId: subRecord.id,
                goal: submission.feedback.goal,
                masteryAchieved: submission.feedback.masteryAchieved || false,
                strengths: JSON.parse(JSON.stringify(submission.feedback.strengths)),
                growthAreas: JSON.parse(JSON.stringify(submission.feedback.growthAreas)),
                nextSteps: JSON.parse(JSON.stringify(submission.feedback.nextSteps)),
              },
              update: {
                goal: submission.feedback.goal,
                masteryAchieved: submission.feedback.masteryAchieved || false,
                strengths: JSON.parse(JSON.stringify(submission.feedback.strengths)),
                growthAreas: JSON.parse(JSON.stringify(submission.feedback.growthAreas)),
                nextSteps: JSON.parse(JSON.stringify(submission.feedback.nextSteps)),
              },
            });
          }
        }
      }

      // Mark session as persisted
      await tx.taskSession.update({
        where: { id: sessionId },
        data: { dataPersisted: true },
      });
    }, { timeout: 15000 });

    return res.json({ persisted: true, studentCount: Object.keys(studentData).length });
  } catch (error) {
    console.error('Persist session error:', error);
    return res.status(500).json({ error: 'Failed to persist session data' });
  }
});

// Teacher removes a student from session
router.delete('/:sessionId/students/:studentId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const studentId = req.params.studentId as string;

    const session = await prisma.taskSession.findFirst({
      where: {
        id: sessionId,
        teacherId: req.teacher!.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Require Redis for live session operations
    const redisClient = requireRedis();

    // Get student data from Redis
    const studentData = await redisClient.hget(sessionKeys.students(sessionId), studentId);
    if (!studentData) {
      return res.status(404).json({ error: 'Student not found in session' });
    }

    const student = JSON.parse(studentData) as StudentSessionData;

    // Update student status to 'removed' in Redis
    student.status = 'removed' as any;
    await redisClient.hset(sessionKeys.students(sessionId), studentId, JSON.stringify(student));

    // Remove submission from Redis (optional - keep for audit trail)
    // await redisClient.del(sessionKeys.submission(sessionId, studentId));

    // Emit WebSocket event to notify the student they've been removed
    emitToStudent(studentId, 'student-removed', {
      studentId,
      message: 'You have been removed from this session by your teacher.',
    });

    // If session has persistence enabled, also update Postgres
    if (session.dataPersisted) {
      await prisma.student.update({
        where: { id: studentId },
        data: { status: 'removed' },
      });
    }

    return res.json({ removed: true });
  } catch (error) {
    console.error('Remove student error:', error);
    return res.status(500).json({ error: 'Failed to remove student' });
  }
});

export default router;

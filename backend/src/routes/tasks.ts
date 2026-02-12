import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateTeacher } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Generate unique task code
function generateTaskCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format: ABC123
  return code.slice(0, 3) + code.slice(3);
}

// Get all tasks for teacher
router.get('/', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { teacherId: req.teacher!.id },
      include: {
        folder: true,
        _count: {
          select: { sessions: true },
        },
        sessions: {
          where: {
            OR: [
              { isLive: true },
              { status: 'ACTIVE' }
            ]
          },
          select: { id: true, status: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to include liveSessionId at top level
    const tasksWithLiveSession = tasks.map(task => ({
      ...task,
      liveSessionId: task.sessions[0]?.id || null,
      sessions: undefined, // Remove the sessions array from response
    }));

    return res.json(tasksWithLiveSession);
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get single task
router.get('/:taskId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        teacherId: req.teacher!.id,
      },
      include: {
        folder: true,
        sessions: {
          where: {
            OR: [
              { isLive: true },
              { status: 'ACTIVE' }
            ]
          },
          take: 1,
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create new task
router.post('/', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, prompt, successCriteria, universalExpectations, folderId, imageUrl, fileType } = req.body;

    if (!title || !successCriteria || !Array.isArray(successCriteria)) {
      return res.status(400).json({ error: 'Question and successCriteria are required' });
    }

    // Generate unique task code
    let taskCode = generateTaskCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.task.findUnique({ where: { taskCode } });
      if (!existing) break;
      taskCode = generateTaskCode();
      attempts++;
    }

    const task = await prisma.task.create({
      data: {
        teacherId: req.teacher!.id,
        title,
        prompt: prompt || '',
        successCriteria,
        universalExpectations: universalExpectations ?? true,
        taskCode,
        folderId: folderId || null,
        imageUrl: imageUrl || null,
        fileType: fileType || null,
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.patch('/:taskId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { title, prompt, successCriteria, universalExpectations, imageUrl, fileType } = req.body;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        teacherId: req.teacher!.id,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        ...(title && { title }),
        ...(prompt && { prompt }),
        ...(successCriteria && { successCriteria }),
        ...(universalExpectations !== undefined && { universalExpectations }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(fileType !== undefined && { fileType: fileType || null }),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// Update task status (activate/deactivate)
router.patch('/:taskId/status', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        teacherId: req.teacher!.id,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Move task to folder
router.patch('/:taskId/folder', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { folderId } = req.body;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        teacherId: req.teacher!.id,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify folder belongs to teacher if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          teacherId: req.teacher!.id,
        },
      });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { folderId: folderId || null },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Move task error:', error);
    return res.status(500).json({ error: 'Failed to move task' });
  }
});

// Delete task
router.delete('/:taskId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        teacherId: req.teacher!.id,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: task.id } });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;

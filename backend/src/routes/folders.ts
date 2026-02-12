import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateTeacher } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Get all folders for teacher
router.get('/', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { teacherId: req.teacher!.id },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(folders);
  } catch (error) {
    console.error('Get folders error:', error);
    return res.status(500).json({ error: 'Failed to get folders' });
  }
});

// Create folder
router.post('/', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const folder = await prisma.folder.create({
      data: {
        teacherId: req.teacher!.id,
        name,
        description: description || null,
        color: color || '#3b82f6',
      },
    });

    return res.status(201).json(folder);
  } catch (error) {
    console.error('Create folder error:', error);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update folder
router.put('/:folderId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const folderId = req.params.folderId as string;
    const { name, description, color } = req.body;

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        teacherId: req.teacher!.id,
      },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updated = await prisma.folder.update({
      where: { id: folder.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update folder error:', error);
    return res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder (tasks move to no folder)
router.delete('/:folderId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const folderId = req.params.folderId as string;

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        teacherId: req.teacher!.id,
      },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Use transaction to ensure atomic operation: move tasks then delete folder
    await prisma.$transaction(async (tx) => {
      // Move tasks out of folder before deleting
      await tx.task.updateMany({
        where: { folderId: folder.id },
        data: { folderId: null },
      });

      await tx.folder.delete({ where: { id: folder.id } });
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete folder error:', error);
    return res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;

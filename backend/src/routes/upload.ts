import { Router, Request, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTeacher } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { Readable } from 'stream';

const router = Router();

// Configure S3 client for Railway Object Storage
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || '';

// Allowed file types for upload
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf'
];

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG images and PDF files are allowed'));
    }
  },
});

// Serve files from S3 (public proxy - no auth required so students can view)
router.get('/file/:folder/:filename', async (req: Request, res: Response) => {
  try {
    const key = `${req.params.folder}/${req.params.filename}` as string;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const result = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    // Set content type
    if (result.ContentType) {
      res.setHeader('Content-Type', result.ContentType);
    }
    // Cache for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Stream the file to the response
    const stream = result.Body as Readable;
    stream.pipe(res);
  } catch (error: any) {
    console.error('File serve error:', error);
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

// Upload file (image or PDF) to S3
router.post('/image', authenticateTeacher, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !BUCKET) {
      return res.status(500).json({ error: 'S3 storage is not configured' });
    }

    const isPdf = req.file.mimetype === 'application/pdf';
    const fileType: 'image' | 'pdf' = isPdf ? 'pdf' : 'image';

    // Generate unique key for the file
    const ext = req.file.originalname.split('.').pop() || (isPdf ? 'pdf' : 'jpg');
    const key = `lara-tasks/${uuidv4()}.${ext}`;

    // Upload to S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    // Return URL that points to our proxy endpoint
    const url = `/api/upload/file/${key}`;

    return res.json({
      url,
      publicId: key,
      fileType,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// Delete file from S3
router.delete('/image/:publicId', authenticateTeacher, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const publicId = req.params.publicId as string;
    const key = publicId.startsWith('lara-tasks/') ? publicId : `lara-tasks/${publicId}`;

    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    return res.json({ deleted: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

export default router;

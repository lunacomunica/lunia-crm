import { Router } from 'express';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../uploads');

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const mediaFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ok = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|avi|webm|x-msvideo))$/.test(file.mimetype);
  cb(null, ok);
};

const anyFilter = (_req: any, _file: Express.Multer.File, cb: multer.FileFilterCallback) => cb(null, true);

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter: mediaFilter });
const uploadAny = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: anyFilter });

router.post('/', upload.array('files', 20), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const BASE = '';
  res.json({
    files: files.map(f => ({
      url: `${BASE}/uploads/${f.filename}`,
      name: f.originalname,
      type: f.mimetype.startsWith('video') ? 'video' : 'image',
    })),
  });
});

router.post('/any', uploadAny.array('files', 10), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const BASE = '';
  res.json({
    files: files.map(f => ({
      url: `${BASE}/uploads/${f.filename}`,
      name: f.originalname,
      mime_type: f.mimetype,
      size: f.size,
    })),
  });
});

export default router;

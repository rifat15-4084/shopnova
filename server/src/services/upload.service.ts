import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { ApiError } from '../utils/errors.js';
import { randomToken } from '../utils/crypto.js';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Read-only filesystem (e.g. Vercel serverless) — local /uploads mode is
  // unavailable there; configure Cloudinary for image uploads in production.
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`) as any);
    }
    cb(null, true);
  },
});

export interface UploadedImage {
  url: string;
  publicId?: string;
  width: number;
  height: number;
}

/**
 * Optimize + persist an uploaded image.
 * Uses Cloudinary when configured, otherwise writes to /uploads (served statically).
 */
export async function storeImage(file: Express.Multer.File): Promise<UploadedImage> {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw ApiError.badRequest(`Unsupported file type: ${file.mimetype}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw ApiError.badRequest('Image must be 5MB or smaller');
  }

  const buffer = await sharp(file.buffer)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (cloudinaryEnabled()) {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'shopnova', resource_type: 'image', transformation: [{ fetch_format: 'auto', quality: 'auto' }] },
        (err, res) => (err ? reject(err) : resolve(res as any)),
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id, width, height };
  }

  const filename = `${Date.now()}-${randomToken(6)}.webp`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await fs.promises.writeFile(fullPath, buffer);
  return { url: `${env.API_URL}/uploads/${filename}`, width, height };
}

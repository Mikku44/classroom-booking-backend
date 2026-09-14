import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../middlewares/error';

export interface ImageStorage {
  save(file: Express.Multer.File): Promise<{ key: string; url: string }>;
  remove(key: string): Promise<void>;
}

const extensionByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

export class LocalImageStorage implements ImageStorage {
  private readonly directory = path.resolve(process.cwd(), 'public', 'assets');

  async save(file: Express.Multer.File) {
    const extension = extensionByMime[file.mimetype];
    if (!extension) throw new AppError(400, 'Only JPEG, PNG, WebP and GIF images are allowed');
    await mkdir(this.directory, { recursive: true });
    const key = randomUUID() + extension;
    await writeFile(path.join(this.directory, key), file.buffer);
    return { key, url: env.PUBLIC_BASE_URL.replace(/\/$/, '') + '/assets/' + key };
  }

  async remove(key: string) {
    const safeKey = path.basename(key);
    if (safeKey !== key) throw new AppError(400, 'Invalid image key');
    try {
      await unlink(path.join(this.directory, safeKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

// เปลี่ยน implementation ตรงนี้เป็น R2ImageStorage เมื่อเปิดใช้ Cloudflare R2
export const imageStorage: ImageStorage = new LocalImageStorage();

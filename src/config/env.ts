import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({DATABASE_URL:z.string().min(1),JWT_SECRET:z.string().min(16),JWT_EXPIRES_IN:z.string().default('1d'),PORT:z.coerce.number().default(3000),ADMIN_EMAIL:z.string().email(),ADMIN_PASSWORD:z.string().min(8),PUBLIC_BASE_URL:z.string().url().default('http://localhost:3000'),STORAGE_DRIVER:z.enum(['local','r2']).default('local')});
export const env=schema.parse(process.env);

import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from backend folder or root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/syncspace?schema=public'),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default('syncspace-dev-access-secret-32-chars-min-change-me'),
  JWT_REFRESH_SECRET: z.string().default('syncspace-dev-refresh-secret-32-chars-min-change-me'),
  COLLAB_TICKET_SECRET: z.string().default('syncspace-dev-collab-ticket-secret-change-me'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  WS_ALLOWED_ORIGIN: z.string().default('http://localhost:5173'),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
};

export const env = parseEnv();

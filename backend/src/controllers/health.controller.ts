import { Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { getRedisClients } from '../redis/redisClient.js';

export class HealthController {
  static async health(_req: Request, res: Response) {
    res.json({
      status: 'ok',
      service: 'syncspace-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  static async ready(_req: Request, res: Response) {
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch (err: any) {
      dbStatus = `unhealthy: ${err.message}`;
    }

    const { isAvailable, instanceId } = getRedisClients();

    const isHealthy = dbStatus === 'healthy';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ready' : 'degraded',
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: isAvailable ? 'connected' : 'standalone-fallback',
          instanceId,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
}

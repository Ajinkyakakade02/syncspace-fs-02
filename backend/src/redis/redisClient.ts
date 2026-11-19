import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Unique instance identifier to prevent echoing published Redis messages back to self
export const SERVER_INSTANCE_ID = `syncspace-inst-${uuidv4().slice(0, 8)}`;

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let isRedisAvailable = false;

export const initRedis = async (): Promise<{ publisher: Redis | null; subscriber: Redis | null; available: boolean }> => {
  if (!env.REDIS_URL) {
    logger.warn('No REDIS_URL configured; running in single-instance mode.');
    return { publisher: null, subscriber: null, available: false };
  }

  try {
    const redisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) {
          logger.warn(`Redis reconnect attempt ${times} failed; pausing retries.`);
          return null; // Stop retrying after 5 attempts
        }
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
    };

    pubClient = new Redis(env.REDIS_URL, redisOptions);
    subClient = new Redis(env.REDIS_URL, redisOptions);

    pubClient.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis Publisher connection warning');
      isRedisAvailable = false;
    });

    subClient.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis Subscriber connection warning');
      isRedisAvailable = false;
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    isRedisAvailable = true;
    logger.info({ instanceId: SERVER_INSTANCE_ID, redisUrl: env.REDIS_URL }, '✅ Connected to Redis Pub/Sub successfully');

    return { publisher: pubClient, subscriber: subClient, available: true };
  } catch (err: any) {
    logger.warn(
      { err: err.message },
      '⚠️ Could not connect to Redis. Running in local single-instance fallback mode.'
    );
    isRedisAvailable = false;
    return { publisher: null, subscriber: null, available: false };
  }
};

export const getRedisClients = () => ({
  pubClient,
  subClient,
  isAvailable: isRedisAvailable,
  instanceId: SERVER_INSTANCE_ID,
});

export const closeRedis = async () => {
  try {
    if (pubClient) await pubClient.quit();
    if (subClient) await subClient.quit();
    logger.info('Redis connections closed.');
  } catch (err) {
    logger.warn({ err }, 'Error closing Redis connections');
  }
};

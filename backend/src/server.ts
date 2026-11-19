import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createWebSocketServer } from './websocket/wsServer.js';
import { initRedis, closeRedis } from './redis/redisClient.js';
import { CollabManager } from './collaboration/collabServer.js';
import { prisma } from './prisma/client.js';

const startServer = async () => {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize WebSocket server on the same HTTP port (route /collaboration)
  const wss = createWebSocketServer(server);

  // Initialize Redis Pub/Sub cluster support
  await initRedis();

  const PORT = env.PORT || 4000;
  const HOST = '0.0.0.0';

  server.listen(PORT, HOST, () => {
    logger.info(`🚀 SyncSpace Backend listening on http://${HOST}:${PORT}`);
    logger.info(`⚡ Real-Time Yjs Collaboration WebSocket mounted at ws://${HOST}:${PORT}/collaboration`);
    logger.info(`🌐 Allowed Frontend Origin: ${env.FRONTEND_ORIGIN}`);
    logger.info(`📦 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new HTTP requests
    server.close(() => {
      logger.info('HTTP server closed.');
    });

    // 2. Close WebSocket connections
    wss.close(() => {
      logger.info('WebSocket server closed.');
    });

    // 3. Persist and flush all active Yjs rooms to PostgreSQL
    await CollabManager.shutdown();

    // 4. Close Redis connections
    await closeRedis();

    // 5. Disconnect Prisma
    await prisma.$disconnect();

    logger.info('Graceful shutdown completed.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});

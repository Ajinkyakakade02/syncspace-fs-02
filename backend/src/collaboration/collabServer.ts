import WebSocket from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { logger } from '../config/logger.js';
import { YjsPersistence } from '../persistence/yjsPersistence.js';
import { getRedisClients, SERVER_INSTANCE_ID } from '../redis/redisClient.js';
import { CollabTicketPayload } from '../types/auth.js';

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;
export const MESSAGE_AUTH = 2;
export const MESSAGE_QUERY_AWARENESS = 3;

export interface ClientConnectionInfo {
  ws: WebSocket;
  ticket: CollabTicketPayload;
  isAlive: boolean;
  subscribedRooms: Set<string>;
}

export class CollabRoom {
  public roomName: string;
  public pageId: string;
  public generation: number;
  public doc: Y.Doc;
  public awareness: awarenessProtocol.Awareness;
  public clients = new Map<WebSocket, ClientConnectionInfo>();
  private redisChannel: string;
  private isSubscribedToRedis = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(roomName: string, pageId: string, generation: number) {
    this.roomName = roomName;
    this.pageId = pageId;
    this.generation = generation;
    this.redisChannel = `syncspace:collab:${roomName}`;

    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Listen to Y.Doc local updates
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      this.handleDocUpdate(update, origin);
    });

    // Listen to awareness changes
    this.awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      this.handleAwarenessUpdate(added.concat(updated, removed), origin);
    });
  }

  /**
   * Initializes room state by loading saved snapshot & updates from PostgreSQL
   */
  async init() {
    await YjsPersistence.loadDocument(this.pageId, this.generation, this.doc);
    await this.subscribeToRedis();
  }

  /**
   * Subscribe to Redis channel for multi-instance cross-pod synchronization
   */
  private async subscribeToRedis() {
    const { subClient, isAvailable } = getRedisClients();
    if (!isAvailable || !subClient || this.isSubscribedToRedis) return;

    try {
      await subClient.subscribe(this.redisChannel);
      this.isSubscribedToRedis = true;

      subClient.on('message', (channel, message) => {
        if (channel !== this.redisChannel) return;
        this.handleRedisMessage(message);
      });

      logger.debug({ channel: this.redisChannel }, 'Subscribed room to Redis channel');
    } catch (err) {
      logger.warn({ err, channel: this.redisChannel }, 'Failed to subscribe to Redis channel');
    }
  }

  /**
   * Handle incoming Redis Pub/Sub messages from other backend instances
   */
  private handleRedisMessage(rawMessage: string) {
    try {
      const payload = JSON.parse(rawMessage);
      // Origin check to prevent infinite echo loops
      if (payload.origin === SERVER_INSTANCE_ID) {
        return;
      }

      if (payload.type === 'sync' && payload.data) {
        const update = new Uint8Array(Buffer.from(payload.data, 'base64'));
        // Apply update to local doc with 'redis-remote' origin so it is NOT re-published to Redis
        Y.applyUpdate(this.doc, update, 'redis-remote');

        // Broadcast to local WebSocket clients
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeUpdate(encoder, update);
        const message = encoding.toUint8Array(encoder);

        this.broadcastToLocalClients(message);
      } else if (payload.type === 'awareness' && payload.data) {
        const awarenessUpdate = new Uint8Array(Buffer.from(payload.data, 'base64'));
        awarenessProtocol.applyAwarenessUpdate(this.awareness, awarenessUpdate, 'redis-remote');
      }
    } catch (err) {
      logger.error({ err, channel: this.redisChannel }, 'Error handling Redis Pub/Sub message');
    }
  }

  /**
   * Called when Y.Doc is modified (either locally or via Redis)
   */
  private handleDocUpdate(update: Uint8Array, origin: any) {
    // 1. If origin is not persistence loading, record the update for PostgreSQL persistence
    if (origin !== 'persistence-load') {
      YjsPersistence.recordUpdate(this.pageId, this.generation, update, this.doc);
    }

    // 2. Broadcast to local connected WebSocket clients (except sender if sender is a local client)
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    for (const [ws, info] of this.clients.entries()) {
      if (ws !== origin && ws.readyState === WebSocket.OPEN) {
        ws.send(message, { binary: true });
      }
    }

    // 3. Publish to Redis for other backend instances if the update originated locally
    if (origin !== 'redis-remote' && origin !== 'persistence-load') {
      const { pubClient, isAvailable } = getRedisClients();
      if (isAvailable && pubClient) {
        const payload = JSON.stringify({
          origin: SERVER_INSTANCE_ID,
          type: 'sync',
          data: Buffer.from(update).toString('base64'),
        });
        pubClient.publish(this.redisChannel, payload).catch((err) => {
          logger.warn({ err }, 'Failed to publish Yjs update to Redis');
        });
      }
    }
  }

  /**
   * Handle awareness changes and broadcast to clients & Redis
   */
  private handleAwarenessUpdate(changedClientIds: number[], origin: any) {
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClientIds);

    // Broadcast to local clients
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessUpdate);
    const message = encoding.toUint8Array(encoder);

    for (const [ws] of this.clients.entries()) {
      if (ws !== origin && ws.readyState === WebSocket.OPEN) {
        ws.send(message, { binary: true });
      }
    }

    // Publish to Redis if not from remote instance
    if (origin !== 'redis-remote') {
      const { pubClient, isAvailable } = getRedisClients();
      if (isAvailable && pubClient) {
        const payload = JSON.stringify({
          origin: SERVER_INSTANCE_ID,
          type: 'awareness',
          data: Buffer.from(awarenessUpdate).toString('base64'),
        });
        pubClient.publish(this.redisChannel, payload).catch((err) => {
          logger.warn({ err }, 'Failed to publish awareness update to Redis');
        });
      }
    }
  }

  private broadcastToLocalClients(message: Uint8Array) {
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message, { binary: true });
      }
    }
  }

  /**
   * Add client to this room
   */
  addClient(ws: WebSocket, info: ClientConnectionInfo) {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.clients.set(ws, info);
    info.subscribedRooms.add(this.roomName);

    // 1. Send syncStep1 from server to client to kickstart synchronization handshake
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder), { binary: true });

    // 2. Send current awareness states to new client
    const awarenessStates = this.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(awarenessStates.keys()))
      );
      ws.send(encoding.toUint8Array(awarenessEncoder), { binary: true });
    }

    logger.debug(
      { room: this.roomName, userId: info.ticket.userId, role: info.ticket.role },
      'Client joined collaboration room'
    );
  }

  /**
   * Remove client from room and cleanup awareness
   */
  removeClient(ws: WebSocket, clientInfo?: ClientConnectionInfo) {
    this.clients.delete(ws);

    if (this.clients.size === 0) {
      // Schedule room eviction after 30 seconds of inactivity
      this.cleanupTimer = setTimeout(() => {
        this.destroyRoom().catch((err) => {
          logger.error({ err, room: this.roomName }, 'Error destroying empty collaboration room');
        });
      }, 30000);
    }
  }

  /**
   * Flush updates, persist snapshot, unsubscribe from Redis, and destroy room
   */
  async destroyRoom() {
    logger.info({ room: this.roomName }, 'Cleaning up and destroying inactive room');
    CollabManager.removeRoom(this.roomName);

    const { subClient, isAvailable } = getRedisClients();
    if (isAvailable && subClient && this.isSubscribedToRedis) {
      try {
        await subClient.unsubscribe(this.redisChannel);
      } catch {}
    }

    await YjsPersistence.flushAndClose(this.pageId, this.generation, this.doc);
    this.awareness.destroy();
    this.doc.destroy();
  }
}

export class CollabManager {
  private static rooms = new Map<string, CollabRoom>();

  static getRoomName(pageId: string, generation: number): string {
    return `page:${pageId}:gen:${generation}`;
  }

  static async getOrCreateRoom(pageId: string, generation: number): Promise<CollabRoom> {
    const roomName = this.getRoomName(pageId, generation);
    let room = this.rooms.get(roomName);

    if (!room) {
      room = new CollabRoom(roomName, pageId, generation);
      this.rooms.set(roomName, room);
      await room.init();
    }

    return room;
  }

  static removeRoom(roomName: string) {
    this.rooms.delete(roomName);
  }

  static getActiveRoom(roomName: string): CollabRoom | undefined {
    return this.rooms.get(roomName);
  }

  static getAllRooms(): CollabRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Shuts down all active rooms cleanly on server shutdown
   */
  static async shutdown() {
    logger.info('Shutting down all active collaboration rooms...');
    const rooms = Array.from(this.rooms.values());
    for (const room of rooms) {
      try {
        await room.destroyRoom();
      } catch (err) {
        logger.error({ err, room: room.roomName }, 'Error shutting down room');
      }
    }
    this.rooms.clear();
  }
}

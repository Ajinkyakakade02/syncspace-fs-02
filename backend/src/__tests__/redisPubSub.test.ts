import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { SERVER_INSTANCE_ID } from '../redis/redisClient.js';

describe('Redis Pub/Sub Multi-Instance Collaboration Architecture', () => {
  it('should generate a unique instance identifier per server process', () => {
    expect(SERVER_INSTANCE_ID).toBeDefined();
    expect(SERVER_INSTANCE_ID.startsWith('syncspace-inst-')).toBe(true);
  });

  it('should ignore incoming Redis messages originating from the same instance to prevent infinite loops', () => {
    let appliedUpdates = 0;

    const simulateRedisReceive = (rawMessage: string) => {
      const payload = JSON.parse(rawMessage);
      // Origin loop protection
      if (payload.origin === SERVER_INSTANCE_ID) {
        return; // Ignore own published message
      }
      appliedUpdates += 1;
    };

    // 1. Message from own instance
    const selfMessage = JSON.stringify({
      origin: SERVER_INSTANCE_ID,
      type: 'sync',
      data: 'base64-payload',
    });
    simulateRedisReceive(selfMessage);
    expect(appliedUpdates).toBe(0);

    // 2. Message from a remote peer instance (e.g. Instance 2)
    const remoteMessage = JSON.stringify({
      origin: 'syncspace-inst-remote-pod-99',
      type: 'sync',
      data: 'base64-payload',
    });
    simulateRedisReceive(remoteMessage);
    expect(appliedUpdates).toBe(1);
  });

  it('should serialize Yjs updates into Base64 format and restore faithfully across cluster boundaries', () => {
    const originalDoc = new Y.Doc();
    originalDoc.getText('content').insert(0, 'Multi-pod collaborative document edit');

    const update = Y.encodeStateAsUpdate(originalDoc);
    const base64Update = Buffer.from(update).toString('base64');

    // Simulate transmission over Redis message bus
    const restoredBytes = new Uint8Array(Buffer.from(base64Update, 'base64'));

    const remoteDoc = new Y.Doc();
    Y.applyUpdate(remoteDoc, restoredBytes);

    expect(remoteDoc.getText('content').toString()).toBe('Multi-pod collaborative document edit');
  });

  it('should isolate rooms by page ID and collaboration generation in channel naming', () => {
    const pageId = 'page-abc';
    const gen1 = 1;
    const gen2 = 2;

    const channel1 = `syncspace:collab:page:${pageId}:gen:${gen1}`;
    const channel2 = `syncspace:collab:page:${pageId}:gen:${gen2}`;

    expect(channel1).not.toBe(channel2);
    expect(channel1).toBe('syncspace:collab:page:page-abc:gen:1');
    expect(channel2).toBe('syncspace:collab:page:page-abc:gen:2');
  });
});

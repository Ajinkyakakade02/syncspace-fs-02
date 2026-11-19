# SyncSpace (FS-02) — Horizontal Scaling with Redis Pub/Sub

---

## 1. The Multi-Instance Collaboration Problem

When scaling a real-time collaborative application across multiple server instances (e.g. Render Web Services, Kubernetes pods, or autoscaling containers), client connections are load-balanced across different physical nodes:

- **User A** connects to **Backend Instance 1**.
- **User B** connects to **Backend Instance 2**.

If User A edits a document, Instance 1 must propagate that change to Instance 2 so User B sees it in real time.

---

## 2. SyncSpace Architecture with Redis Pub/Sub

SyncSpace integrates Redis Pub/Sub using two dedicated non-blocking `ioredis` connections per backend process:
1. **Publisher Client:** Publishes local Yjs update packets and awareness heartbeats.
2. **Subscriber Client:** Listens to active document channels.

```
[Browser 1]                     [Browser 2]
     |                               |
     v (WSS)                         v (WSS)
+---------------+               +---------------+
|   Backend 1   |               |   Backend 2   |
| (Origin: inst1)|               | (Origin: inst2)|
+---------------+               +---------------+
     | (Publish)                     ^ (Subscribe)
     |                               |
     +-------> [ REDIS PUB/SUB BUS ] +
           Channel: syncspace:collab:page:{id}:gen:{gen}
```

---

## 3. Broadcast Loop Prevention

Without origin tracking, a distributed pub/sub system will enter an infinite broadcast feedback loop:
- Instance 1 publishes to Redis.
- Instance 1 receives its own published message back from Redis.
- Instance 1 re-applies it, emits an update event, and re-publishes to Redis indefinitely.

### Solution:
1. At process boot, every backend generates a unique `SERVER_INSTANCE_ID`:
   ```ts
   export const SERVER_INSTANCE_ID = `syncspace-inst-${uuidv4().slice(0, 8)}`;
   ```
2. When publishing to Redis, the message is wrapped in an envelope:
   ```json
   {
     "origin": "syncspace-inst-a1b2c3d4",
     "type": "sync",
     "data": "base64EncodedYjsUpdate..."
   }
   ```
3. When the subscriber receives a message:
   ```ts
   if (payload.origin === SERVER_INSTANCE_ID) {
     return; // Discard own message, preventing broadcast reflection!
   }
   // Apply update locally with 'redis-remote' origin
   Y.applyUpdate(room.doc, update, 'redis-remote');
   ```
4. The local doc listener checks `if (origin !== 'redis-remote')` before publishing to Redis, ensuring messages from remote peers are forwarded to local WebSockets but never echoed back to the bus.

---

## 4. Single-Instance Fallback Mode

If `REDIS_URL` is not provided or if the Redis cluster is temporarily unreachable:
- SyncSpace logs a clear warning: `⚠️ Could not connect to Redis. Running in local single-instance fallback mode.`
- The application continues serving REST requests and in-process WebSocket collaboration cleanly without crashing.
- Healthcheck endpoint `/api/health/ready` accurately reports `"redis": { "status": "standalone-fallback" }`.

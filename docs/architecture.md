# SyncSpace (FS-02) — System Architecture

**Project:** SYNCSPACE — Real-Time Collaborative Document Workspace  
**Organization:** Nexvia Technologies Private Limited  
**Track:** Full-Stack Development  

---

## 1. Architectural Overview

SyncSpace is engineered as a high-performance distributed real-time collaborative workspace inspired by Notion and Figma. It employs Conflict-Free Replicated Data Types (CRDTs via Yjs), WebSockets, and Redis Pub/Sub to deliver sub-50ms synchronized editing across multiple browser clients and server instances.

```
+-------------------------------------------------------------------------+
|                                BROWSERS                                 |
|   [Client 1 (Alice - Owner)]                [Client 2 (Bob - Editor)]   |
|   - React + TipTap Editor                   - React + TipTap Editor     |
|   - Local Y.Doc + Awareness                 - Local Y.Doc + Awareness   |
+-------------------------------------------------------------------------+
                    |                                     |
         HTTPS REST | WSS /collaboration       HTTPS REST | WSS /collaboration
                    v                                     v
+-------------------------------------------------------------------------+
|                        RENDER BACKEND INSTANCES                         |
|   +----------------------------------+  +---------------------------+   |
|   |        BACKEND INSTANCE 1        |  |    BACKEND INSTANCE 2     |   |
|   | - Express.js REST APIs           |  | - Express.js REST APIs    |   |
|   | - ws WebSocket Upgrade Handler   |  | - ws WebSocket Upgrade    |   |
|   | - Room Manager (CollabRoom)      |  | - Room Manager            |   |
|   | - Role Enforcement Filter        |  | - Role Enforcement Filter |   |
|   | - In-Memory Y.Doc & Awareness    |  | - In-Memory Y.Doc         |   |
|   +----------------------------------+  +---------------------------+   |
+-------------------------------------------------------------------------+
                    |                                     |
                    +------------------+------------------+
                                       |
                   Redis Pub/Sub Bus   |   PostgreSQL / Neon
                   (Cross-Pod Sync)    |   (Durable Persistence)
                                       v
         +----------------------------------------------------+
         |   REDIS CLUSTER / PUB-SUB                          |
         |   Channel: syncspace:collab:page:{pageId}:gen:{gen}|
         |   - Broadcasts binary sync updates & awareness     |
         |   - Origin loop suppression (SERVER_INSTANCE_ID)   |
         +----------------------------------------------------+
                                       |
                                       v
         +----------------------------------------------------+
         |   NEON POSTGRESQL / PRISMA ORM                     |
         |   - Users, Workspaces, Members, Pages              |
         |   - CollaborationDocument (Compacted snapshot)     |
         |   - CollaborationUpdate (Incremental Yjs logs)     |
         |   - PageVersion (Historical milestones & restore)  |
         |   - Comments, CommentReplies, RefreshTokens        |
         +----------------------------------------------------+
```

---

## 2. Component Breakdown

### 2.1 Frontend (Vercel)
- **Framework:** React 18 + Vite + TypeScript.
- **Styling & Design Tokens:** Tailwind CSS, Plus Jakarta Sans, JetBrains Mono, full light & dark mode support.
- **Rich-Text Engine:** TipTap with `@tiptap/extension-collaboration` and `@tiptap/extension-collaboration-cursor`.
- **State Management & Data Fetching:** React Context (`AuthContext`, `ThemeContext`), Axios interceptors with automated refresh token rotation.
- **Collaboration Provider:** `useCollaboration` hook orchestrating WebSocket connection, Yjs state exchange, awareness cursor tracking, and reconnection with exponential backoff.

### 2.2 Backend & WebSocket Server (Render)
- **Runtime:** Node.js + Express.js in TypeScript.
- **WebSocket Protocol:** Mounted on `/collaboration` on the same HTTP server port (eliminating separate port overhead on Render).
- **Authentication Handshake:** REST endpoint `POST /api/pages/:pageId/collaboration-ticket` issues short-lived (60s) HMAC tickets. WebSocket verifies tickets during HTTP upgrade.
- **Permissions Layer:** Strict role enforcement (OWNER, ADMIN, EDITOR, COMMENTER, VIEWER). Viewer and Commenter sockets are blocked from submitting Yjs updates.
- **Persistence Layer:** `YjsPersistence` debounces binary updates and compacts snapshots into PostgreSQL.

### 2.3 Distributed Multi-Instance Synchronization (Redis)
- **Bus:** `ioredis` publisher and subscriber connections.
- **Channels:** Scoped per document room: `syncspace:collab:page:{pageId}:gen:{generation}`.
- **Loop Prevention:** Every server process generates a unique `SERVER_INSTANCE_ID`. Messages published to Redis carry this origin; subscriber ignores self-published events.

### 2.4 Database & ORM (Neon PostgreSQL + Prisma)
- **Dual Connection Architecture:**
  - `DATABASE_URL`: Connection-pooled URL for runtime queries.
  - `DIRECT_URL`: Direct URL for Prisma migrations and schema synchronization.
- **Binary CRDT Storage:** Stores Yjs snapshots and delta updates as raw PostgreSQL `BYTEA` (`Bytes` in Prisma).

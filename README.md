# SyncSpace — Real-Time Collaborative Document Workspace (FS-02)

**Track:** Full-Stack Development  
**Organization:** Nexvia Technologies Private Limited  
**Project:** FS-02 — Real-Time Collaborative Workspace  
**Application Name:** SyncSpace  

---

## 1. Project Overview

**SyncSpace** is an enterprise-grade real-time collaborative workspace inspired by Notion and Figma. It enables distributed teams to edit rich text documents concurrently with live cursors, awareness tooltips, persistent threaded comments, and immutable version milestones.

Unlike naive document editors that overwrite content using "last-write-wins" HTTP requests, SyncSpace is built on **Conflict-Free Replicated Data Types (CRDTs)** powered by **Yjs** and synchronized across distributed server pods using **WebSockets** and **Redis Pub/Sub**. All document changes persist durably to **PostgreSQL via Prisma ORM**.

---

## 2. Core Features

- **Live Multi-User Collaboration:** Instantaneous conflict-free text synchronization powered by Yjs CRDTs.
- **Collaborator Presence & Live Carets:** Real-time user avatars, colored caret cursors, selection highlights, and typing indicators via Yjs Awareness.
- **Rich-Text TipTap Editor:** Headings (H1-H3), bold, italic, underline, strikethrough, highlights, task checklists, blockquotes, code blocks, tables, and links.
- **Durable PostgreSQL Persistence:** Compacted binary snapshot storage (`BYTEA`) and incremental update batching prevent data loss during page reloads or server restarts.
- **Generation-Safe Version History & Restore:** Create named snapshot milestones and safely restore historical versions by bumping collaboration generations without monotonic CRDT merge corruption.
- **Threaded Discussions & Comments:** Inline comments, author attribution, and resolution status toggling.
- **Role-Based Access Control (RBAC):** Strict permissions (OWNER, ADMIN, EDITOR, COMMENTER, VIEWER) enforced across both REST endpoints and binary WebSocket packets.
- **Redis Pub/Sub Cluster Scaling:** Cross-instance document update and presence relay with unique origin ID loop suppression.
- **Zero-Cost Deployment Ready:** Prepared for Vercel (Frontend), Render (Backend Web Service), Neon (Serverless PostgreSQL), and Upstash (Redis).

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Plus Jakarta Sans, JetBrains Mono
- **Editor Canvas:** TipTap, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`
- **Collaboration Client:** Yjs v13, `y-protocols`, `lib0`
- **Networking & Routing:** React Router v6, Axios with automatic token refresh interceptors
- **Icons & UI:** Lucide React, React Hot Toast

### Backend
- **Runtime:** Node.js, Express.js, TypeScript
- **Real-Time Engine:** `ws` WebSocket Server mounted at `/collaboration`
- **CRDT Server Protocols:** `y-protocols/sync`, `y-protocols/awareness`
- **Database ORM:** PostgreSQL, Prisma ORM 6.19.3 (Neon pooled & direct connection ready)
- **Distributed Bus:** `ioredis` Redis Pub/Sub client
- **Security & Validation:** bcrypt password hashing, JWT access/refresh tokens, Zod, Helmet, CORS, express-rate-limit, Pino structured logger

---

## 4. Architecture Diagram

```
[Browser A (Alice - Owner)]          [Browser B (Bob - Editor)]
         |                                       |
         | HTTPS REST & WSS /collaboration       | HTTPS REST & WSS /collaboration
         v                                       v
+-------------------------------------------------------------+
|               RENDER BACKEND WEB SERVICE                    |
| - Express.js REST API Layer                                 |
| - Integrated ws WebSocket Server on /collaboration          |
| - Authentication Ticket Verifier (Single-use HMAC)          |
| - Role Enforcement Filter (Blocks Viewer / Commenter edits) |
| - In-Memory CollabRoom & Awareness Protocol Engine          |
+-------------------------------------------------------------+
          |                                       |
          | Redis Pub/Sub                         | Prisma ORM
          v                                       v
+-----------------------+              +----------------------+
| UPSTASH / REDIS BUS   |              | NEON POSTGRESQL DB   |
| - Channel: syncspace: |              | - Users & Workspaces |
|   collab:page:id:gen  |              | - CollabDocument     |
| - Origin Loop Guard   |              | - CollabUpdate       |
+-----------------------+              | - PageVersion        |
                                       | - Comment & Replies  |
                                       +----------------------+
```

---

## 5. Local Development Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker Desktop (for local Postgres & Redis containers)

### 1. Clone & Install Dependencies
```bash
cd FS-02
npm install
```

### 2. Start Local PostgreSQL & Redis Containers
```bash
npm run docker:up
```

### 3. Setup Environment Variables
Copy template into `backend/.env`:
```bash
cp .env.example backend/.env
```

### 4. Run Prisma Migrations & Seed Demo Data
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Demo accounts created:
- **Alice (Owner):** `alice@syncspace.io` / `Password123!`
- **Bob (Editor):** `bob@syncspace.io` / `Password123!`
- **Charlie (Viewer):** `charlie@syncspace.io` / `Password123!`

### 5. Launch Development Servers
```bash
npm run dev
```
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **WebSocket Endpoint:** ws://localhost:4000/collaboration

---

## 6. Testing & Build Commands

```bash
# Run all automated tests (Unit, CRDT, RBAC, Redis)
npm run test

# Run backend unit tests specifically
npm run test:backend

# Run frontend component tests
npm run test:frontend

# Run Playwright E2E collaborative test
npm run test:e2e

# Run TypeScript typechecks
npm run typecheck

# Build both frontend and backend for production
npm run build
```

---

## 7. Cloud Deployment Summary

SyncSpace is architected to run permanently on free tiers:
1. **Database:** Neon PostgreSQL ([neon.tech](https://neon.tech)) with pooled `DATABASE_URL` and direct `DIRECT_URL`.
2. **Redis:** Upstash Redis ([upstash.com](https://upstash.com)) with TLS connection.
3. **Backend:** Render Web Service ([render.com](https://render.com)) running Node.js and WebSockets on the same port.
4. **Frontend:** Vercel ([vercel.com](https://vercel.com)) connected to `FS-02/frontend` with SPA rewrite configuration.

For complete step-by-step instructions, refer to [docs/deployment-guide.md](docs/deployment-guide.md).  
For the deployment configuration matrix, see [CREDENTIALS_SETUP.md](CREDENTIALS_SETUP.md).

---

## 8. Known Limitations & Future Enhancements

- **Anchored Comments in Editor Text:** Comments are persistent and page-scoped with optional JSON selection coordinates. In future sprints, dynamic relative position re-anchoring across massive text insertions can be expanded.
- **Offline PWA Support:** Client maintains in-memory Yjs updates across network drops. A service worker indexedDB cache can be added for multi-day offline cold starts.

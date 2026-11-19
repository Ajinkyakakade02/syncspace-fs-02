# SyncSpace (FS-02) — 10-Minute Technical Presentation Outline

**Speaker:** Full-Stack Engineering Intern  
**Project:** FS-02 — Real-Time Collaborative Workspace (SyncSpace)  
**Track:** Full-Stack Development, Nexvia Technologies Private Limited  

---

## Slide 1: Title & Introduction (1 Minute)
- **Title:** SyncSpace — Notion-Inspired Collaborative Document Workspace Powered by CRDTs & Distributed WebSockets.
- **Problem Statement:** Traditional document tools rely on pessimistic file locking or fragile last-write-wins overwrites that destroy team edits.
- **Objective:** Build a real-time, zero-conflict collaborative platform with live presence, persistent state, and multi-instance horizontal scalability.

---

## Slide 2: High-Level Architecture (1.5 Minutes)
- **Frontend:** React 18, Vite, Tailwind CSS, TipTap rich text canvas.
- **Backend:** Node.js, Express, TypeScript, integrated WebSocket server on `/collaboration`.
- **Database:** PostgreSQL with Prisma ORM, deployed on Neon Serverless.
- **Coordination & Scale:** Redis Pub/Sub cluster bus with origin-based loop suppression.
- **Zero-Cost Deployment:** Vercel (Frontend) + Render Web Service (Backend).

---

## Slide 3: The Engine: Yjs CRDT vs Operational Transformation (2 Minutes)
- Explain Conflict-Free Replicated Data Types (CRDTs).
- Why Operational Transformation (Google Docs style) suffers from complex central server locks.
- How Yjs uses item blocks `(client, clock)`, doubly-linked graphs, and commutative state vectors.
- Live demo of mathematical convergence: User A types at position 0, User B types at position 10 concurrently; both merge deterministically without a single conflict prompt.

---

## Slide 4: Real-Time Handshake & Enterprise Security (1.5 Minutes)
- Handshake security: Avoiding permanent JWT query parameters in WebSockets.
- Short-lived single-use collaboration tickets issued via `POST /api/pages/:id/collaboration-ticket`.
- Strict RBAC: OWNER, ADMIN, EDITOR, COMMENTER, VIEWER.
- Enforcement at the socket level: Viewer and Commenter sockets cannot emit Yjs update packets.

---

## Slide 5: Durable PostgreSQL Persistence & Compaction (1.5 Minutes)
- Storing binary Yjs state in PostgreSQL `BYTEA` columns (`Bytes` in Prisma).
- Debounced batch writing of updates (`CollaborationUpdate`).
- Compaction mechanism: Flattening update logs into a unified snapshot (`CollaborationDocument.snapshot`) to prevent log unbounded growth.
- Proving persistence: Edit -> Restart backend -> Refresh browser -> Content fully restored!

---

## Slide 6: Multi-Instance Scaling via Redis Pub/Sub (1 Minute)
- The split-pod problem: User A connected to Pod 1, User B connected to Pod 2.
- Scoped channels: `syncspace:collab:page:{pageId}:gen:{generation}`.
- Infinite loop prevention: `SERVER_INSTANCE_ID` origin tagging.
- Single-instance fallback mode when Redis is offline.

---

## Slide 7: Live Product Walkthrough & Collaboration Demo (1 Minute)
- Split screen: Two browser windows side-by-side.
- Real-time typing, live colored carets, and awareness tooltips.
- Adding inline comments & resolving discussion threads.
- Saving a milestone snapshot and demonstrating generation-safe version restore.

---

## Slide 8: Conclusion & Q&A (0.5 Minutes)
- Summary of achievements: 21 automated tests passed, 0 TypeScript errors, 100% production-ready.
- Budget adherence: ₹0 cloud budget utilizing Neon, Render, Vercel, and Upstash free tiers.
- Questions & Discussion.

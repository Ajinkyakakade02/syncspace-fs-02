# SyncSpace (FS-02) — Credentials & Deployment Configuration Guide

This document contains the consolidated list of all environment variables required for local execution and manual cloud deployment.

> **Zero-Cost & Security Note:** No real cloud credentials have been auto-generated or requested. Configure these secrets in your own hosting dashboards (Render, Vercel, Neon, Redis).

---

## 1. Environment Variables Master Matrix

| Variable Name | Purpose | Where to Obtain | Secret? | Required Locally? | Required in Production? | Where to Configure |
|---|---|---|---|---|---|---|
| `NODE_ENV` | Sets execution mode (`development`, `test`, `production`) | Manual setting | No | Yes (`development`) | Yes (`production`) | `backend/.env`, Render Settings |
| `PORT` | HTTP & WebSocket server port | Manual (Render assigns automatically) | No | Yes (default `4000`) | Yes (`4000`) | `backend/.env`, Render Settings |
| `DATABASE_URL` | Pooled connection string used at runtime by backend | Neon Dashboard -> Connection Details -> Pooled Connection (or local Docker Postgres) | **YES** | Yes (`postgresql://postgres:postgres@localhost:5432/syncspace?schema=public`) | Yes | `backend/.env`, Render Settings |
| `DIRECT_URL` | Direct non-pooled connection string used for Prisma migrations | Neon Dashboard -> Connection Details -> Direct Connection (Unpooled) | **YES** | Optional (same as local `DATABASE_URL`) | Yes | `backend/.env`, Render Settings |
| `REDIS_URL` | Redis Pub/Sub cluster connection URL | Upstash / Redis Cloud Dashboard (or local Docker Redis) | **YES** | Optional (`redis://localhost:6379`) | Yes | `backend/.env`, Render Settings |
| `JWT_ACCESS_SECRET` | Secret key used to sign user access JWTs | Generate via terminal: `openssl rand -base64 32` | **YES** | Yes | Yes | `backend/.env`, Render Settings |
| `JWT_REFRESH_SECRET` | Secret key used to sign refresh JWTs | Generate via terminal: `openssl rand -base64 32` | **YES** | Yes | Yes | `backend/.env`, Render Settings |
| `COLLAB_TICKET_SECRET` | Secret key used to sign short-lived WebSocket collaboration tickets | Generate via terminal: `openssl rand -base64 32` | **YES** | Yes | Yes | `backend/.env`, Render Settings |
| `ACCESS_TOKEN_EXPIRES_IN`| Lifespan of access tokens | Manual setting (`15m`) | No | Yes (`15m`) | Yes (`15m`) | `backend/.env`, Render Settings |
| `REFRESH_TOKEN_EXPIRES_IN`| Lifespan of refresh tokens | Manual setting (`7d`) | No | Yes (`7d`) | Yes (`7d`) | `backend/.env`, Render Settings |
| `FRONTEND_ORIGIN` | CORS allowed origin for frontend | Vercel deployed URL or local port | No | Yes (`http://localhost:5173`) | Yes (`https://<app>.vercel.app`) | `backend/.env`, Render Settings |
| `WS_ALLOWED_ORIGIN` | WebSocket allowed handshake origin | Vercel deployed URL or local port | No | Yes (`http://localhost:5173`) | Yes (`https://<app>.vercel.app`) | `backend/.env`, Render Settings |
| `VITE_API_URL` | Base HTTP endpoint for backend REST APIs | Render deployed Web Service URL or local port | No | Yes (`http://localhost:4000`) | Yes (`https://<app>.onrender.com`) | `frontend/.env`, Vercel Settings |
| `VITE_WS_URL` | Base WebSocket endpoint for Yjs collaboration | Render deployed WebSocket URL or local port | No | Yes (`ws://localhost:4000/collaboration`) | Yes (`wss://<app>.onrender.com/collaboration`) | `frontend/.env`, Vercel Settings |

---

## 2. Neon Pooled vs Direct Connection String Distinction

Neon is a serverless PostgreSQL database with automated compute scaling and connection pooling:

1. **`DATABASE_URL` (Pooled Connection):**
   - Routes through Neon's PgBouncer connection pooler (`-pooler` subdomain).
   - Keeps connection overhead minimal when hundreds of serverless or container requests hit the database.
   - Used by the running backend application in production.
2. **`DIRECT_URL` (Direct Connection):**
   - Bypasses the connection pooler and connects directly to the dedicated Postgres engine.
   - Required by Prisma CLI for running schema migrations (`prisma migrate dev`, `prisma migrate deploy`) and schema alterations, because connection poolers in transaction mode do not support prepared statements or migration advisory locks.

In `schema.prisma`, this is configured seamlessly:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 3. Local Development Template (.env)

Copy the following into `FS-02/backend/.env` for local testing:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/syncspace?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/syncspace?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="syncspace-dev-access-secret-32-chars-min-change-me"
JWT_REFRESH_SECRET="syncspace-dev-refresh-secret-32-chars-min-change-me"
COLLAB_TICKET_SECRET="syncspace-dev-collab-ticket-secret-change-me"

ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

FRONTEND_ORIGIN="http://localhost:5173"
WS_ALLOWED_ORIGIN="http://localhost:5173"
```

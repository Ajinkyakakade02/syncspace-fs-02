# SyncSpace (FS-02) — Complete Cloud Deployment Guide

**Target Budget:** ₹0 (Zero-Cost Free-Tier Architecture)  
**Targets:** Vercel (Frontend), Render (Backend Web Service), Neon (PostgreSQL), Upstash / Redis Cloud (Redis)  

---

## 1. Cloud Architecture Blueprint

```
Browser Clients
      |
      v
+-------------------------------+
|  Vercel Frontend (React SPA)  |
|  - Root Dir: FS-02/frontend   |
|  - Framework: Vite            |
+-------------------------------+
      |
      | HTTPS REST & WSS /collaboration
      v
+-------------------------------+
|  Render Web Service (Node.js) |
|  - Root Dir: FS-02/backend    |
|  - Express REST APIs          |
|  - Integrated WebSocket Engine|
+-------------------------------+
      |                       |
      v                       v
+------------------+    +-----------------------+
|  Neon PostgreSQL |    | Upstash / Cloud Redis |
|  - Pooled URL    |    | - Redis Pub/Sub Bus   |
|  - Direct URL    |    |   Cross-pod sync      |
+------------------+    +-----------------------+
```

---

## 2. Step 1: Neon PostgreSQL Setup

1. Sign up for a free account at [neon.tech](https://neon.tech).
2. Create a new project named `syncspace`.
3. In the Neon Dashboard, go to **Connection Details**:
   - Select **Connection pooling**: ON. Copy the pooled connection string. This is your `DATABASE_URL`.
     ```env
     DATABASE_URL="postgresql://user:pass@ep-pooler-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
     ```
   - Select **Connection pooling**: OFF. Copy the direct connection string. This is your `DIRECT_URL`.
     ```env
     DIRECT_URL="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
     ```
4. Note: Neon requires SSL (`sslmode=require`), which is already configured.

---

## 3. Step 2: Redis Setup

1. Sign up for a free Redis database on [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com).
2. Create a database named `syncspace-collab`.
3. Copy the `rediss://...` or `redis://...` URL. This is your `REDIS_URL`.
   ```env
   REDIS_URL="rediss://default:password@endpoint.upstash.io:6379"
   ```

---

## 4. Step 3: Render Backend Deployment

1. Sign up or log into [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your Git repository.
4. Configure service settings:
   - **Name:** `syncspace-api`
   - **Root Directory:** `FS-02/backend`
   - **Environment:** `Node`
   - **Region:** Choose closest to your database (e.g. Frankfurt, Oregon, Ohio).
   - **Branch:** `main`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm start`
   - **Plan:** Free ($0/month)
5. Under **Environment Variables**, add:
   | Variable | Value / Description |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` (Render will inject its own port into process.env.PORT automatically) |
   | `DATABASE_URL` | Pooled Neon PostgreSQL connection string |
   | `DIRECT_URL` | Direct Neon PostgreSQL connection string |
   | `REDIS_URL` | Your Redis connection string |
   | `JWT_ACCESS_SECRET` | Generate random 32-character secret (`openssl rand -base64 32`) |
   | `JWT_REFRESH_SECRET` | Generate random 32-character secret |
   | `COLLAB_TICKET_SECRET` | Generate random 32-character secret |
   | `ACCESS_TOKEN_EXPIRES_IN` | `15m` |
   | `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
   | `FRONTEND_ORIGIN` | `https://<your-vercel-app>.vercel.app` |
   | `WS_ALLOWED_ORIGIN` | `https://<your-vercel-app>.vercel.app` |
6. Click **Create Web Service**.
7. Once deployed, verify health at `https://<your-render-app>.onrender.com/api/health/ready`.

---

## 5. Step 4: Vercel Frontend Deployment

1. Sign up or log into [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. Configure build settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and select `FS-02/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   | Variable | Example Value |
   |---|---|
   | `VITE_API_URL` | `https://syncspace-api.onrender.com` |
   | `VITE_WS_URL` | `wss://syncspace-api.onrender.com/collaboration` |
6. Click **Deploy**.
7. Copy your production Vercel URL (e.g., `https://syncspace.vercel.app`) and update the `FRONTEND_ORIGIN` in Render's environment settings.

---

## 6. Verification & Troubleshooting Checklist

- [ ] Open two browser windows (one incognito).
- [ ] Log into Window 1 as Alice (`alice@syncspace.io`), Window 2 as Bob (`bob@syncspace.io`).
- [ ] Open the same document URL in both windows.
- [ ] Verify both connection badges read **Synced**.
- [ ] Verify each other's colored cursor appears.
- [ ] Type concurrently and confirm instantaneous merge.
- [ ] Refresh Window 1 and verify all edits persist from PostgreSQL.

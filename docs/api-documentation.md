# SyncSpace (FS-02) — REST & WebSocket API Specification

**Base URL:** `http://localhost:4000/api` (Local) / `https://<render-backend>.onrender.com/api` (Production)  
**WebSocket URL:** `ws://localhost:4000/collaboration` / `wss://<render-backend>.onrender.com/collaboration`  

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
- **Body:** `{ name, email, password, confirmPassword }`
- **Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "name": "...", "email": "...", "cursorColor": "#3b82f6" },
      "accessToken": "ey...",
      "defaultWorkspaceId": "...",
      "defaultPageId": "..."
    }
  }
  ```

### `POST /api/auth/login`
- **Body:** `{ email, password }`
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "name": "...", "email": "...", "cursorColor": "#3b82f6" },
      "accessToken": "ey..."
    }
  }
  ```

### `POST /api/auth/refresh`
- **Headers:** `Cookie: refreshToken=...` or Body: `{ refreshToken: "..." }`
- **Response:** `200 OK` with rotated access token and new HTTP-only refresh cookie.

### `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `200 OK` with authenticated user profile.

---

## 2. Workspaces Endpoints

### `GET /api/workspaces`
- **Response:** Array of workspaces with `currentUserRole`, member count, and page count.

### `POST /api/workspaces`
- **Body:** `{ name: "Acme Team", description: "Product workspace" }`
- **Response:** `201 Created`

### `GET /api/workspaces/:id`
- **Response:** Workspace details, member list, and active pages. Requires `VIEWER` or higher.

### `PATCH /api/workspaces/:id`
- **Body:** `{ name?: "...", description?: "..." }`. Requires `ADMIN` or `OWNER`.

### `DELETE /api/workspaces/:id`
- **Response:** `200 OK`. Requires `OWNER`.

---

## 3. Members & Invitations Endpoints

### `GET /api/workspaces/:id/members`
- **Response:** List of members with user details and roles.

### `POST /api/workspaces/:id/invitations`
- **Body:** `{ email: "colleague@example.com", role: "EDITOR" }`
- **Response:** `201 Created` with `rawToken` and expiration.

### `POST /api/invitations/:token/accept`
- **Response:** `200 OK` with `{ workspaceId, role }`.

### `PATCH /api/workspaces/:id/members/:memberId/role`
- **Body:** `{ role: "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER" }`. Requires `ADMIN` or `OWNER`.

### `DELETE /api/workspaces/:id/members/:memberId`
- **Response:** `200 OK`. Removes member from workspace.

---

## 4. Pages & Documents Endpoints

### `GET /api/workspaces/:id/pages`
- **Response:** All non-archived pages in the workspace sorted by order.

### `POST /api/workspaces/:id/pages`
- **Body:** `{ title: "Sprint Backlog", icon: "📋" }`. Requires `ADMIN` or `OWNER`.

### `GET /api/pages/:pageId`
- **Response:** Full page record including creator, editor, and generation.

### `PATCH /api/pages/:pageId`
- **Body:** `{ title?: "...", icon?: "...", isArchived?: boolean }`. Requires `EDITOR` or higher.

### `DELETE /api/pages/:pageId`
- **Response:** `200 OK`. Requires `ADMIN` or `OWNER`.

---

## 5. Collaboration Handshake & WebSocket Endpoints

### `POST /api/pages/:pageId/collaboration-ticket`
- **Description:** Generates a short-lived single-use ticket for the WebSocket handshake.
- **Response:** `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "ticket": "eyJhbGciOi...",
      "pageId": "...",
      "workspaceId": "...",
      "generation": 1,
      "role": "EDITOR",
      "canEdit": true,
      "expiresInSeconds": 60
    }
  }
  ```

### `GET /api/pages/:pageId/collaboration-status`
- **Response:** Active room connection stats, in-memory status, and Redis cluster availability.

### `WSS /collaboration?ticket={ticket}&pageId={pageId}&gen={generation}`
- **Handshake:** Validates ticket secret, page access, and generation matching.
- **Binary Protocols:**
  - `MESSAGE_SYNC = 0`: Exchanges syncStep1, syncStep2, and incremental Yjs updates.
  - `MESSAGE_AWARENESS = 1`: Updates live cursor coordinates, user names, and colors.
- **Security Check:** If a user with `VIEWER` or `COMMENTER` role submits an update packet, it is dropped immediately and not applied to the room document.

---

## 6. Comments & Versions Endpoints

- `GET /api/pages/:pageId/comments`
- `POST /api/pages/:pageId/comments`
- `PATCH /api/comments/:commentId/resolve`
- `POST /api/comments/:commentId/replies`
- `GET /api/pages/:pageId/versions`
- `POST /api/pages/:pageId/versions`
- `POST /api/pages/:pageId/versions/:versionId/restore` (Bumps collaboration generation and re-creates document state)

---

## 7. Health Endpoints

- `GET /api/health` -> `{ status: "ok", uptime: ... }`
- `GET /api/health/ready` -> Database ping latency & Redis cluster connection check.

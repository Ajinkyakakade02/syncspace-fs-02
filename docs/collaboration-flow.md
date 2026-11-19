# SyncSpace (FS-02) — Real-Time Collaboration Flow

---

## 1. Sequence Diagram: Collaboration Handshake & Editing

```mermaid
sequenceDiagram
    autonumber
    actor Alice as User A (Browser 1)
    actor Bob as User B (Browser 2)
    participant Backend as Node.js Backend & WS
    participant Redis as Redis Pub/Sub Bus
    participant DB as PostgreSQL / Neon

    Note over Alice, DB: Step 1: Secure Handshake
    Alice->>Backend: POST /api/pages/:id/collaboration-ticket
    Backend-->>Alice: { ticket: "JWT...", generation: 1, canEdit: true }
    Alice->>Backend: WS Upgrade /collaboration?ticket=...&pageId=...&gen=1
    Backend->>Backend: Verify ticket, permissions & generation
    Backend->>DB: Load snapshot & pending updates
    Backend-->>Alice: WS Connected + Send SyncStep1 + Current Awareness

    Note over Bob, DB: Step 2: Second Collaborator Joins
    Bob->>Backend: POST /api/pages/:id/collaboration-ticket
    Backend-->>Bob: { ticket: "JWT...", generation: 1, canEdit: true }
    Bob->>Backend: WS Upgrade /collaboration?ticket=...&pageId=...&gen=1
    Backend-->>Bob: Send SyncStep1 + Alice's Awareness (Cursor & Name)
    Backend-->>Alice: Send Bob's Awareness

    Note over Alice, Bob: Step 3: Concurrent Real-Time Editing
    Alice->>Backend: Yjs Update (User A inserts sentence)
    Backend->>Alice: Local ACK
    Backend->>DB: Queue update for debounced batch persistence
    Backend->>Redis: Publish to channel syncspace:collab:page:...
    Backend->>Bob: Forward Yjs Update binary message
    Bob->>Bob: Y.applyUpdate(doc, update) -> editor text updates live!

    Bob->>Backend: Yjs Update (User B edits second paragraph)
    Backend->>Alice: Forward Yjs Update binary message
    Alice->>Alice: Y.applyUpdate(doc, update) -> CRDT mathematically converges!

    Note over Backend, DB: Step 4: Durable PostgreSQL Compaction
    Backend->>DB: Batch insert CollaborationUpdate records
    Backend->>DB: Periodic snapshot compaction (Y.encodeStateAsUpdate)
```

---

## 2. Reconnection & Offline Handling

When a user temporarily loses connectivity:
1. Local edits are buffered inside the client's in-memory `Y.Doc`.
2. The `useCollaboration` hook detects the drop and switches the status badge to `Reconnecting...`.
3. Exponential backoff kicks in (1s, 2s, 4s, up to 10s).
4. Upon reconnection:
   - Client requests a fresh ticket.
   - Client sends its current `stateVector` via `SyncStep1`.
   - Server returns only the delta updates that occurred while the client was offline.
   - Client transmits any buffered local updates to the server.
   - The document converges instantly with zero manual merge prompts!

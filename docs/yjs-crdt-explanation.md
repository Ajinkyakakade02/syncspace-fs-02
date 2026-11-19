# SyncSpace (FS-02) — Yjs & CRDT Mathematical Deep Dive

---

## 1. What is a CRDT?

A **Conflict-Free Replicated Data Type (CRDT)** is a distributed data structure that allows multiple concurrent edits across distributed nodes without requiring an authoritative locking server or centralized operational transform (OT) coordinator.

CRDTs satisfy three essential algebraic properties:
1. **Commutative:** The order in which operations are received does not affect the final state ($A \ast B = B \ast A$).
2. **Associative:** Grouping of operations does not change the result ($(A \ast B) \ast C = A \ast (B \ast C)$).
3. **Idempotent:** Applying the same operation more than once produces the same outcome ($A \ast A = A$).

Together, these ensure **Strong Eventual Consistency (SEC)**: as soon as two nodes have received the same set of updates, their internal states are guaranteed to be mathematically identical.

---

## 2. Why Yjs Over Traditional Operational Transformation (OT)?

| Feature | Operational Transformation (Google Docs) | Yjs CRDT (SyncSpace) |
|---|---|---|
| **Central Authority** | Requires central single-server lock to order operations | Decentralized; any node can merge updates peer-to-peer |
| **Offline Edits** | Complex to replay long offline divergence queues | Native; state vectors seamlessly compute minimal deltas |
| **Horizontal Scaling** | Hard to scale across independent WebSocket clusters | Straightforward with Redis Pub/Sub broadcast |
| **Performance** | O(N²) complex transformation matrices | O(1) to O(log N) skip-list block graph |
| **Network Jitter** | Vulnerable to out-of-order packets | Immune; updates commute deterministically |

---

## 3. How Yjs Structures Collaborative Text

Yjs represents linear text and structured ProseMirror trees as a doubly-linked list of **Item blocks**:

```
[Item 1: "Hello "] <---> [Item 2: "World"]
```

Each block contains:
- `id`: A tuple of `(clientIdentifier, clockCounter)`.
- `left` and `right`: Pointers to predecessor and successor blocks at insertion time.
- `content`: The text string or XML fragment node.
- `deleted`: A boolean tombstone flag (characters are never physically removed immediately; they are marked deleted to preserve reference integrity).

### Conflict Resolution Rule:
When User A and User B concurrently insert text between `[Item 1]` and `[Item 2]`:
- User A inserts `"Awesome "` with ID `(ClientA, 1)`.
- User B inserts `"Great "` with ID `(ClientB, 1)`.
- Both point to `left = Item 1`.
- Yjs breaks the tie deterministically by comparing client identifiers: if `ClientA > ClientB`, `(ClientA, 1)` is positioned before `(ClientB, 1)`. Every client computing this independently arrives at the exact same sequence without any network round-trip negotiation!

---

## 4. State Vectors & Differential Synchronization

A **State Vector** is a compact map summarizing the latest clock counter seen from each client:
```json
{
  "Client_1": 42,
  "Client_2": 18
}
```

When client connects:
1. Client sends `encodeStateVector(localDoc)`.
2. Server reads state vector and computes `encodeStateAsUpdate(serverDoc, clientStateVector)`.
3. The resulting binary byte payload contains **only the delta items** that Client has not yet seen!
4. Bandwidth is minimized, and initial sync takes milliseconds even for massive documents.

---

## 5. Generation-Based Safe Snapshot Restore

A major challenge in naive CRDT applications is that applying an old state to an existing Y.Doc merges it with all subsequent edits rather than rewinding them (because CRDTs are monotonic).

SyncSpace solves this cleanly via **Collaboration Generations**:
1. When a historical version is restored, `Page.collaborationGeneration` is incremented (e.g. from `1` to `2`).
2. A new `CollaborationDocument` is created in PostgreSQL with `generation = 2`, pre-seeded with the target historical snapshot bytes.
3. The old room (`page:{id}:gen:1`) is invalidated, and connected clients receive a notification to reconnect.
4. Clients request a new collaboration ticket, which is bound to `generation = 2`.
5. Clients mount a fresh `Y.Doc` initialized strictly with the restored version, preserving full historical auditability while completely eliminating merge pollution!

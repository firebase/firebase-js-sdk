# Query Lifecycle & Persistence State

This document details the internal state machine of a Firestore query from creation to garbage collection. While [architecture.md](./architecture.md) covers the high-level flow of data, this document focuses on the management of internal resources, specifically the distinction between user-facing `Queries` and system-facing `Targets`.

## Key Concepts

*   **Query**: The immutable public object representing the user's request (e.g., `coll.where("status", "==", "online")`).
*   **Target**: The internal representation of a Query sent to the backend. It is assigned a unique integer `TargetID`.
*   **TargetData**: Metadata persisted about a Target in the `targets` table, including its `resumeToken`, `snapshotVersion`, and `lastListenSequenceNumber`.
*   **Overlay**: A computed data structure representing a local mutation (Set/Patch) that has not yet been synced to the server. The SDK "overlays" this on top of the Remote Document to calculate the user's view.
*   **Limbo**: A synchronization state where a document exists locally and matches a query, but the backend hasn't explicitly confirmed it exists in the current snapshot version.

---

## Phase 1: Fan-Out & Deduplication (Event Manager)

When a user calls `onSnapshot(query, callback)`, the **Event Manager** does not immediately spawn a network request.

1.  **Deduplication**: The Event Manager calculates the "Canonical ID" of the query to check if an identical `Query` is already active in the system.
2.  **Fan-Out**:
    *   **If Active**: The new listener is attached to the existing `QueryListener`. The current cached view is returned immediately via `fromCache: true`.
    *   **If New**: The Event Manager forwards the request to the **Sync Engine**.

## Phase 2: Target Allocation (Sync Engine)

The **Sync Engine** acts as the coordinator between the User World (Query) and the System World (Target).

1.  **Allocation**: The Sync Engine asks the **Local Store** to allocate a `TargetID` for the query.
2.  **Persistence**: The `TargetData` is written to the `targets` table (IndexedDB) with an initial `sequence_number`.
3.  **Watch Stream**: The Sync Engine instructs the **Remote Store** to begin listening to this `TargetID` over the network.

## Phase 3: The "View" Calculation (Local Store)

The "View" is what the user actually sees via the API. It is constructed purely from local data, allowing for offline access and optimistic updates.

> **Formula:** `View = RemoteDocuments (Cache) + Overlays (Pending Writes)`

When a query runs (initially or after a remote update), the **Local Store** performs the following:

1.  **Execution**: The `Query Engine` determines the most efficient strategy to find the set of matching `DocumentKeys`.
    *   *Deep Dive*: For details on Index Scans, Full Scans, and Optimization strategies, see [Query Execution & Indexing](./query-execution.md).
2.  **Base State**: The store retrieves the confirmed server state from the `remote_documents` table.
3.  **Overlay Application**:
    *   The store checks the `mutation_queue` for any pending writes associated with these keys.
    *   These mutations are converted into **Overlays**.
    *   The Overlay is applied on top of the Remote Document.
4.  **Projection**: The final composed documents are sent to the Event Manager.

*Note: This design ensures users always see their own pending writes immediately (Latency Compensation), even if the backend has not acknowledged them.*

## Phase 4: Synchronization & Limbo Resolution

As the **Remote Store** receives snapshot events from the backend, the Sync Engine reconciles the state. This usually follows a "Happy Path," but occasionally encounters "Limbo."

### The Happy Path
1.  Backend sends a `DocumentChange`.
2.  Sync Engine updates `remote_documents` table.
3.  Local Store recalculates the View.
4.  If the view changes, Event Manager fires the user callback.

### The Limbo State
Limbo occurs when the local cache holds a document that the server implies should not be there (usually detected via an **Existence Filter Mismatch**).

1.  **Detection**: The Sync Engine compares the server's count of matching documents against the local count. If they disagree, it initiates the resolution process.
2.  **Resolution**: The SDK uses **Bloom Filters** to identify exactly which local documents are stale. These documents enter "Limbo."
3.  **Verification**: The Sync Engine spins up a targeted listener for the Limbo documents.
    *   If the server returns the document: It is updated.
    *   If the server returns "Not Found": It is removed from the view.

*For a detailed explanation of Resume Tokens, Bloom Filters, and the mechanics of this process, see **[Limbo Resolution](./limbo-resolution.md)**.*


## Phase 5: Teardown (Stop Listening)

When a user calls `unsubscribe()`, data is **not** immediately deleted.

1.  **Event Manager**: Decrements the listener count for that Query.
2.  **Zero-Count**: If the count hits 0, the Event Manager notifies the Sync Engine.
3.  **Sync Engine**:
    *   Removes the `TargetID` from the Remote Store (stopping the network stream).
    *   **Crucial**: The data in `remote_documents` and the metadata in `targets` remains on disk. This allows for "Offline Query Acceleration" if the user restarts the app or re-issues the query later.

## Phase 6: Garbage Collection (The "Death" of a Query)

Since data persists after `unsubscribe()`, the SDK must actively manage disk usage.

*   **Eager GC**: If persistence is disabled, data is cleared from memory immediately when the listener count hits 0.
*   **LRU GC**: If persistence is enabled, the data remains on disk for offline availability.

The **LruGarbageCollector** runs periodically to keep the cache within the configured size (default 40MB/100MB). It uses a "Sequence Number" system to track when data was last used.

For a detailed walkthrough of the algorithm, Sequence Numbers, and Orphaned Documents, see **[Garbage Collection](./garbage-collection.md)**.


## Debugging Tips

If you are debugging a **"Zombie Document"** (data appearing that should be gone) or **"Missing Data"**:

1.  **Check `targets`**: Is there an active target (valid `resumeToken`) covering that document?
2.  **Check `mutation_queue`**: Is there a pending mutation (BatchID) that hasn't been acknowledged? This creates an Overlay that persists even if the remote doc is deleted.
3.  **Check `target_documents`**: Is the document explicitly linked to a TargetID that you thought was closed?
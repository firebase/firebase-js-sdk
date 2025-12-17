# Persistence Schema (IndexedDB)

The Firestore JS SDK persists data to IndexedDB to support offline querying, latency compensation, and app restarts.

While the Android/iOS SDKs use SQLite, the JS SDK uses IndexedDB Object Stores. However, the logical schema is identical across platforms to ensure consistent behavior.

## Core Object Stores

### `remote_documents`
*   **Concept**: The client's cache of the backend's "Source of Truth."
*   **Key**: `DocumentKey` (Path to the document).
*   **Value**:
    *   **Document Data**: The serialized Protobuf of the document.
    *   **ReadTime**: The snapshot version at which this document was read.
*   **Note**: This store **never** contains local, unacknowledged writes. It only contains data confirmed by the server. To see what the developer sees, we overlay the `mutation_queue` on top of this.

### `mutation_queue`
*   **Concept**: The "Pending Writes" queue. An ordered log of all local writes that have not yet been acknowledged by the server.
*   **Key**: `(user_id, batch_id)`. Segregating by User ID ensures that if a user logs out, their pending writes do not leak to the next user.
*   **Value**: A serialized `MutationBatch` containing one or more mutations (Set, Patch, Delete).
*   **Behavior**: This is the "Single Source of Truth" for local changes. If the app restarts, the SDK replays these mutations to rebuild the Overlays. When the network is available, the `RemoteStore` reads from this queue to send write batches to the backend. Once acknowledged, entries are removed.

### `document_overlays`
*   **Concept**: A cache of the *result* of applying pending mutations.
*   **Key**: `(user_id, document_key)`.
*   **Purpose**: Read Performance. Without this table, the SDK would have to read the Remote Document and re-apply every pending mutation from the queue every time a query ran.
*   **Lifecycle**: Created immediately when a user writes. Deleted immediately when the backend acknowledges the write (or rejects it).
*   **Priority**: When the `LocalStore` reads a document, it checks this table first. If an entry exists, it takes precedence over `remote_documents`.

### `targets`
*   **Concept**: Metadata about active and cached queries.
*   **Key**: `TargetID` (Internal Integer allocated by `SyncEngine`).
*   **Value**:
    *   **Canonical ID**: A hash string representing the query (filters, sort order). Used for deduplication.
    *   **Resume Token**: An opaque token from the backend used to resume a stream without re-downloading all data.
    *   **Last Sequence Number**: Used for Garbage Collection (LRU).

### `target_documents` (The Index)
*   **Concept**: A reverse index mapping `TargetID` $\leftrightarrow$ `DocumentKey`.
*   **Purpose**:
    1.  **Query Execution**: Quickly identify documents for a query.
    2.  **Garbage Collection**: Acts as a reference counter. If a document has entries here with active TargetIDs, it cannot be collected.
*   **Sentinel Rows**: A row with `TargetID = 0` indicates the document exists in the cache but may not be attached to any active listener. These are primary candidates for Garbage Collection.
*   **Maintenance**: This is updated whenever a remote snapshot adds/removes a document from a query view.

## Metadata & Garbage Collection Stores

### `target_globals`
*   **Concept**: A singleton store for global system state.
*   **Key**: Fixed singleton key.
*   **Value**:
    *   **`last_sequence_number`**: A global integer counter incremented on every transaction.
    *   **`target_count`**: Number of targets currently tracked.

### `remote_document_changes` (Ephemeral)
*   **Concept**: A temporary staging area used during `SyncEngine` processing.
*   **Purpose**: Used to track read-time updates for documents during a remote event application before they are committed to the main `remote_documents` store.

## Data Relationships

1.  **The "View"**: To construct a document for the developer, the SDK reads `remote_documents[key]` and applies any mutations found in `mutation_queue` matching that key.
2.  **Garbage Collection**: The `LruGarbageCollector` uses `target_globals.last_sequence_number` and `targets.last_sequence_number` to determine which targets are old and can be evicted. It then uses `target_documents` to find which documents are no longer referenced by *any* target and deletes them from `remote_documents`.
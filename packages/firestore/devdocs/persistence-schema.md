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
*   **Note**: This store **never** contains local, unacknowledged writes. It only contains data confirmed by the server. To see what the developer sees, we overlay the `mutation_queues` on top of this.

### `mutation_queues`
*   **Concept**: The "Pending Writes" queue.
*   **Key**: `BatchID` (Integer, auto-incrementing).
*   **Grouping**: Queues are partitioned by **UID**. When a developer logs out, the SDK switches to a different queue.
*   **Value**:
    *   **Mutation**: The serialized operation (Set, Patch, Delete).
    *   **Metadata**: Timestamp, offsets.
*   **Behavior**: When the network is available, the `RemoteStore` reads from this queue to send write batches to the backend. Once acknowledged, entries are removed.

### `targets`
*   **Concept**: Metadata about active and cached queries.
*   **Key**: `TargetID` (Internal Integer allocated by `SyncEngine`).
*   **Value**:
    *   **Canonical ID**: A hash string representing the query (filters, sort order). Used for deduplication.
    *   **Resume Token**: An opaque token from the backend used to resume a stream without re-downloading all data.
    *   **Last Sequence Number**: Used for Garbage Collection (LRU).

### `target_documents` (The Index)
*   **Concept**: A reverse index mapping `TargetID` $\leftrightarrow$ `DocumentKey`.
*   **Purpose**: Optimization. When a query is executed locally, the SDK uses this index to quickly identify which documents belong to a specific TargetID without scanning the entire `remote_documents` table.
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

1.  **The "View"**: To construct a document for the developer, the SDK reads `remote_documents[key]` and applies any mutations found in `mutation_queues` matching that key.
2.  **Garbage Collection**: The `LruGarbageCollector` uses `target_globals.last_sequence_number` and `targets.last_sequence_number` to determine which targets are old and can be evicted. It then uses `target_documents` to find which documents are no longer referenced by *any* target and deletes them from `remote_documents`.
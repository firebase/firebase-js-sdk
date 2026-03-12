# Write Lifecycle & Latency Compensation

This document details the lifecycle of a write operation (Set, Update, Delete) from the moment the API is called to when it is committed to the backend. It describes the data flow managed by the [Sync Engine](./architecture.md#sync-engine).

It focuses on **Mutations**, **Overlays**, and how the SDK achieves instant **Latency Compensation**.

## Key Concepts

*   **Mutation**: An operation that modifies a document (e.g., `SetMutation`, `PatchMutation`, `DeleteMutation`).
*   **Mutation Batch**: A group of mutations that must be applied atomically. Every user write creates a new Batch with a unique `BatchID`.
*   **Overlay**: A "Materialized View" of the changes applied to a document. Instead of re-calculating the result of a mutation every time a query runs, the SDK calculates the result *once* at write time and saves it as an Overlay.

## Phase 1: Mutation Creation & Batching

When a user calls `setDoc` or `updateDoc`:
1.  **Validation**: The SDK validates the data locally.
2.  **Batching**: The operation is wrapped in a `MutationBatch`.
3.  **Persistence**: The batch is serialized and saved to the **Mutation Queue** in IndexedDB.
    *   **Partitioning**: Queues are partitioned by User ID. If the user is offline, these batches accumulate in the queue.

## Phase 2: Overlay Calculation (Optimization)

To ensure queries run fast, the SDK does not apply raw mutations to remote documents during every query execution. Instead, it pre-calculates the result.

1.  **Base State**: The SDK retrieves the current state of the document (from **Remote Document Cache**).
2.  **Apply**: It applies the new `Mutation` to the base state to determine what the document *should* look like locally.
3.  **Persist Overlay**: This resulting state is saved to the **Document Overlay Cache**.
    *   **Field Mask**: The overlay tracks specifically which fields were modified.
4.  **Latency Compensation**: The `Event Manager` immediately triggers active listeners. The listeners read the `Overlay` instead of the `Remote Document`, giving the user the illusion of instant updates.

> **Formula:** `Local View = Remote Document + Overlay`

## Phase 3: Synchronization (The Write Pipeline)

The `SyncEngine` manages the flow of data to the server:

1.  **Filling the Pipeline**: The `RemoteStore` reads the **Mutation Queue** in order of `BatchID` (FIFO).
2.  **Transmission**: Mutations are sent to the backend via gRPC (or REST in Lite).
3.  **Atomicity**: If a batch contains multiple writes, the backend guarantees they are applied together or not at all.

## Phase 4: Acknowledgement & Cleanup

When the backend responds:

### Scenario A: Success (Ack)
1.  **Commit**: The backend commits the change and returns the authoritative version of the document (and transformation results, like server timestamps).
2.  **Update Remote**: The SDK updates the **Remote Document Cache** with this new server version.
3.  **Cleanup**:
    *   The `MutationBatch` is removed from **Mutation Queue**.
    *   The corresponding `Overlay` is removed from **Document Overlay Cache** (since the Remote Document now matches the desired state).
4.  **Re-Evaluation**: Active queries are re-run. Since the Overlay is gone, they now read the updated Remote Document.

### Scenario B: Rejection
1.  The `MutationBatch` is removed.
2.  The `Overlay` is removed.
3.  The Local View reverts to the `Remote Document` state (rolling back the optimistic update).
# Garbage Collection (LRU)

This document details how the SDK manages local cache size to prevent unbounded growth. It explains the distinction between Eager and LRU collection, the criteria for deletion, and the sequence-number-based algorithm used to identify old data.

## Strategies: Eager vs. LRU

The SDK employs two different strategies depending on the persistence mode:

1.  **Eager GC (Memory Persistence)**:
    *   Used when persistence is disabled (in-memory only).
    *   **Behavior**: When a query is stopped (`unsubscribe()`), the SDK immediately releases the reference to the data. If no other active query references those documents, they are deleted from memory instantly.
    *   **Pros/Cons**: extremely memory efficient, but offers no offline caching across app restarts.

2.  **LRU GC (Disk Persistence)**:
    *   Used when persistence is enabled (IndexedDB).
    *   **Behavior**: When a query is stopped, the data remains on disk. A background process periodically checks the total cache size. If it exceeds a threshold, the "Least Recently Used" data is purged.
    *   **Pros/Cons**: Supports offline apps and faster re-querying, but requires complex management of "Sequence Numbers" to track usage.

*The rest of this document focuses on the LRU strategy.*

## What is Collected?

Garbage collection runs in the background. It does not indiscriminately delete data. It looks for **Eligible** items:

### 1. Inactive Targets
A `Target` (internal query representation) is eligible for collection if it is no longer being listened to by the user.

### 2. Orphaned Documents
A document is only eligible for collection if it is **Orphaned**. A document is Orphaned if:
*   **No Active Targets**: It does not match *any* currently active query listener.
*   **No Pending Mutations**: There are no local edits (Sets/Patches) waiting to be sent to the backend.

> **Note**: Mutations are *never* garbage collected. They are only removed once the backend accepts or rejects them.

## Key Concepts

### Sequence Numbers (The Logical Clock)
To determine "recency," the SDK maintains a global `lastListenSequenceNumber` in the **Target Globals** store (`targetGlobal`).
*   **Tick**: Every transaction (write, query listen, remote update) increments this number.
*   **Tagging**: When a Target is actively listened to or updated, its `lastListenSequenceNumber` is updated to the current global tick.
*   **Effect**: Higher numbers = More recently used.

### The Reference Map (`targetDocuments`)
The **Target-Document Index** (`targetDocuments`) acts as a reference counter linking Documents to Targets.
*   **Active Association**: If `targetId: 2` matches `documentKey: A`, a row exists.
*   **Sentinel Rows (`targetId: 0`)**: If a document exists in the cache but is not matched by *any* specific target (perhaps previously downloaded, or part of a target that was deleted), it may have a row with `targetId: 0`. This marks the document as present but potentially orphaned.

## The Collection Algorithm

The `LruGarbageCollector` runs periodically (e.g., every few minutes).

1.  **Threshold Check**: It calculates the byte size of the current cache. If `CurrentSize < CacheSizeBytes` (default 100MB), the process aborts.
2.  **Calculate Cutoff**:
    *   The GC decides how many items to cull (e.g., 10%).
    *   It queries the **Target-Document Index** (`targetDocuments`) table, ordered by `sequenceNumber` ASC.
    *   It finds the sequence number at the 10th percentile. This becomes the **Upper Bound**.
3.  **Sweep Targets**:
    *   Any Target in the **Targets** table (`targets`) with a `lastListenSequenceNumber` <= **Upper Bound** is deleted.
    *   This removes the "Active" link for any documents associated with that target.
4.  **Sweep Documents**:
    *   The GC scans for documents that have *no* rows in **Target-Document Index** (or only sentinel rows) AND have a sequence number <= **Upper Bound**.
    *   These "Orphaned" documents are deleted from the **Remote Document Cache** (`remoteDocuments`).
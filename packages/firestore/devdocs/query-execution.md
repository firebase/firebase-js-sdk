# Query Execution & Indexing

*Note: This document details the internal algorithms used during **View Calculation** of the [Query Lifecycle](./query-lifecycle.md). It focuses on the performance and mechanics of the **Local Store**.*

## The Query Engine

The **Query Engine** is the component within the **Local Store** responsible for finding the set of document keys that match a given query. It does not load the full document data; it only identifies the keys. It employs a hierarchy of strategies, ordered by efficiency:

1.  **Full Index Scan (O(log N))**:
    *   Used when a Client-Side Index (CSI) exists that covers all filters and sort orders of the query.
    *   This is the most performant strategy.
2.  **Partial Index Scan**:
    *   Used when an index covers some filters (typically equality filters like `where('status', '==', 'published')`).
    *   The engine uses the index to narrow down the potential keys and then performs a scan on that smaller subset to verify the remaining conditions.
3.  **Index-Free (Timestamp) Optimization**:
    *   **Concept**: If the client has been online and syncing, it knows the state of the collection up to a specific point in time (the `lastLimboFreeSnapshot`).
    *   **Mechanism**: The SDK assumes the "base state" (documents matching at the last snapshot) is correct. It then only scans the `remote_documents` table for documents modified *after* that snapshot version.
    *   This drastically reduces the work required for active listeners, changing the cost from *Collection Size* to *Recent Change Volume*.
4.  **Full Collection Scan (O(N))**:
    *   The fallback strategy. The engine iterates through every document in the collection locally to check for matches.

## Client-Side Indexing (CSI)

To support efficient querying without blocking the main thread, the SDK utilizes a decoupled indexing architecture.

*   **Structure**: Index entries are stored in a dedicated `index_entries` table. An entry maps field values (e.g., `(coll/doc1, fieldA=1)`) to a document key.
*   **The Index Backfiller**: Indexes are **not** updated synchronously when you write a document. Instead, a background task called the **Backfiller** runs periodically (when the SDK is idle). It reads new/modified documents and updates the index entries.
*   **Hybrid Lookup**: Because the Backfiller is asynchronous, the index might be "stale" (behind the document cache). To guarantee consistency, the Query Engine performs a **Hybrid Lookup**:
    1.  Query the **Index** for results up to the `IndexOffset` (the point where the Backfiller stopped).
    2.  Query the **Remote Document Cache** for any documents modified *after* the `IndexOffset`.
    3.  Merge the results.

## Composite Queries (OR / IN)

Queries using `OR` or `IN` are not executed as a single monolithic scan. The SDK transforms these into **Disjunctive Normal Form (DNF)**—essentially breaking them into multiple sub-queries.

*   **Execution**: Each sub-query is executed independently using the strategies above (Index vs. Scan).
*   **Union**: The resulting sets of document keys are unioned together in memory to produce the final result.
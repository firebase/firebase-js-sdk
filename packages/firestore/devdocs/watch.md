# The Watch System

This document explains the "Watch" backend system, which powers the real-time capabilities and standard read/write operations of the Firestore SDKs.

## Overview

"Watch" is the internal name for the high-scale system that the SDKs interact with. It serves two primary purposes:

1.  **Reads & Writes**: It is the main entry point for standard document operations.
2.  **Real-Time Listeners**: It powers the `onSnapshot` live updates by tracking database changes and pushing them to clients.

## Architecture: The Reverse Proxy

Watch functions as a massive **Reverse Proxy**.

1.  **Connection**: Massive numbers of end-user devices (phones, browsers) connect directly to Watch.
2.  **Routing**: Watch takes the incoming query or write and forwards it to the appropriate underlying storage backend (partition).
3.  **Observation**: For queries, Watch doesn't just fetch data once. It "watches" the backend for any writes that would affect the query results and pushes those changes to the subscribed client.

This architecture allows Firestore to handle millions of concurrent connections while abstracting the complexity of sharding and storage from the client.

## Consistency Guarantees

The Watch system (exposed via the `Listen` endpoint) enables strong consistency between reads and writes.

*   **Consistency**: All reads and writes performed through this system are consistent with each other. If you write a document and then immediately read it (or listen to it) via Watch, you will see the latest version.
*   **Authentication**: Watch interacts directly with Firebase Auth to identify the user and enforces Firestore Security Rules for every operation.

> [!IMPORTANT]
> **Transactions** use a different endpoint (`runTransaction`) and **do not** guarantee consistency with the Watch stream. See [Transactions](./transactions.md) for details.

### Scalability and Client-Side Logic
The Watch system operates at a massive scale. To maintain performance, the backend may rely on the SDK to handle certain query complexities, particularly for **local** execution and consistency.

> [!NOTE]
> **Composite Queries (OR/IN)**
> While the Watch system supports complex queries (including `OR` and `IN`), the SDK performs significant client-side logic to support them efficiently **locally**.
> *   **Local Indexing**: For local cache execution, the SDK transforms composite queries into **Disjunctive Normal Form (DNF)** (breaking them into simpler sub-queries) to utilize simple field indexes.
> *   **consistency**: The SDK merges results from the Watch stream and local cache to ensure a consistent view.

This architectural decision explains why you see complex logic like **Composite Query** execution in the [Query Engine](./query-execution.md). The SDK implements this logic to bridge the gap between user intent and Watch's scalability constraints.

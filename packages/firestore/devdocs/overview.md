# Firestore JavaScript SDK Overview

This document is the starting point for navigating the Firestore JavaScript SDK codebase documentation. It provides a high-level overview of the SDK, how it is built, tested, and the developer workflow.

All contributors are expected to be familiar with the [prerequisites](./prerequisites.md) before working in this codebase.

## Project Goals

The Firestore JavaScript SDK is one of the official client-side library for interacting with [Google Cloud Firestore](https://firebase.google.com/docs/firestore). It is designed to be used in a variety of JavaScript environments, including web browsers (primary and common) and Node.js (secondary and rare). It is important to distinguish this SDK from the [Google Cloud Firestore server-side SDK for Node.js](https://github.com/googleapis/nodejs-firestore). While this SDK can run in Node.js, it is primarily designed for client-side use. The server-side SDK is intended for trusted environments and offers different capabilities. However, the two SDKs are designed to harmonize where helpful (e.g. data models) to facilitate easier full-stack application development.

The primary goals of this SDK are:

*   Provide a simple and intuitive API for reading and writing data to Firestore.
*   Support real-time data synchronization with streaming queries.
*   Enable offline data access and query caching.
*   Offer a lightweight version for applications that do not require advanced features.
*   Maintain API and architectural symmetry with the [Firestore Android SDK](https://github.com/firebase/firebase-android-sdk) and [Firestore iOS SDK](https://github.com/firebase/firebase-ios-sdk). This consistency simplifies maintenance and makes it easier to port features between platforms. The public API is intentionally consistent across platforms, even if it means being less idiomatic, to allow developers to more easily port their application code.

## Designed for Flicker-Free Responsiveness

Firestore is designed to help developers build responsive front-end applications that eliminate UI flicker.

1.  **Immediate Cache Results**: The SDK returns query results from the local cache immediately, while fetching the latest data from the server in the background.
2.  **Optimistic Updates**: Writes are applied to the local cache *instantly*, allowing the UI to update without waiting for network confirmation.
3.  **Background Synchronization**: The SDK handles the network communication to commit these changes to the backend asynchronously.

*This means the "Happy Path" handles latency automatically. You don't write special code to manage loading states for every interaction; the SDK provides instant feedback by default.*



## Operational Modes

At a high level, all interactions with Firestore can be categorized as either reading or writing data. The SDK provides different mechanisms for these operations, each with distinct guarantees and performance characteristics.

### Read Operations

There are two fundamental ways to read data from Firestore:

*   **One-Time Reads**: This is for fetching a snapshot of data at a specific moment. It's a simple request-response model. You ask for a document or the results of a query, and the server sends back the data as it exists at that instant.

*   **Real-Time Listeners**: This allows you to subscribe to a document or a query. The server first sends you the initial data and then continues to push updates to your client in real time as the data changes. This is the foundation of Firestore's real-time capabilities.

### Write Operations

All data modifications—creates, updates, and deletes—are treated as "writes." The SDK is designed to make writes atomic and resilient. There are two fundamental ways to write data to Firestore:

*   **One-Time Writes**: When a user performs a write (create, update, or delete), the operation is not sent directly to the backend. Instead, it's treated as a "mutation" and added to the local **Mutation Queue**. The SDK "optimistically" assumes the write will succeed on the backend and immediately reflects the change in the local view of the data, making the change visible to local queries. The SDK then works to synchronize this queue with the backend. This design is crucial for supporting offline functionality, as pending writes can be retried automatically when network connectivity is restored.

*   **Transactions**: For grouping multiple write operations into a single atomic unit, the SDK provides `runTransaction`. Unlike standard writes, transactions do not use the optimistic, offline-capable write pipeline (Mutation Queue). Instead, they use an **Optimistic Concurrency Control** mechanism dependent on the backend.
    *   They are **Online-only**: Reads and writes communicate directly with the backend via RPCs.
    *   They are **Atomic**: All operations succeed or fail together.
    *   They are **Retriable**: The SDK automatically retries the transaction if the underlying data changes on the server during execution.
    *   For implementation details, see [Transactions](./transactions.md).

## Key Concepts & Vocabulary

*   **Query**: The client-side representation of a data request (filters, order bys).

*   **Mutation**: A user-initiated change (Set, Update, Delete). Mutations are queued locally and sent to the backend.
*   **Overlay**: The computed result of applying a Mutation to a Document. We store these to show "Optimistic Updates" instantly without modifying the underlying "Remote Document" until the server confirms the write.
*   **Limbo**: A state where a document exists locally and matches a query, but the server hasn't explicitly confirmed it belongs to the current snapshot version. The SDK must perform "Limbo Resolution" to ensure these documents are valid.

For a detailed explanation of how these concepts interact during execution, see the [Query Lifecycle](./query-lifecycle.md) documentation.

## Artifacts

The Firestore JavaScript SDK is divided into two main packages:

*   `@firebase/firestore`: The main, full-featured SDK that provides streaming and offline support.
*   `@firebase/firestore/lite`: A much lighter-weight (AKA "lite") version of the SDK for applications that do not require streaming or offline support.


## Documentation Map

To navigate the internals of the SDK, use the following guide:

### Getting Started (Build & Run)
*   **[Start Here: Build & Run](../CONTRIBUTING.md)**: How to set up the repo, build the SDK, and run tests.

### Core Concepts
*   **[Architecture](./architecture.md)**: The high-level block diagram of the system (API -> Core -> Local -> Remote).
*   **[Query Lifecycle](./query-lifecycle.md)**: The state machine of a query. **Read this** to understand how querying and offline capabilities work.
*   **[Write Lifecycle](./write-lifecycle.md)**: How writes work (Mutations, Batches, Overlays).

### Subsystem Deep Dives
*   **[Watch System](./watch.md)**: Explains some of the backend architecture and its guarantees.
*   **[Query Execution](./query-execution.md)**: Details on the algorithms used by the Local Store to execute queries (Index Scans vs. Full Collection Scans).
*   **[Garbage Collection](./garbage-collection.md)**: Details the LRU algorithm, Sequence Numbers, and how the SDK manages cache size.
*   **[Persistence Schema](./persistence-schema.md)**: A reference guide for the IndexedDB tables.
*   **[Transactions](./transactions.md)**: How the SDK implements Optimistic Concurrency Control, retries, and the online-only write pipeline.
*   **[Limbo Resolution](./limbo-resolution.md)**: How the SDK detects and cleans up stale data using Existence Filters and Bloom Filters.
*   **[Bundles](./bundles.md)**: How the SDK loads and processes data bundles.

### Developer Guides
*   **[Code Layout](./code-layout.md)**: Maps the architectural components to specific source files and directories.
*   **[Build Process](./build.md)**: How to build the artifacts.
*   **[Testing](./testing.md)**: How to run unit and integration tests.
*   **[Spec Tests](./spec-tests.md)**: Deep dive into the cross-platform JSON test suite.
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


## Key Concepts & Vocabulary

*   **Query**: The client-side representation of a data request (filters, order bys).
*   **Target**: The backend's representation of a Query. The SDK allocates a unique integer `TargetID` for every unique query to manage the real-time stream.
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

### Core Concepts
*   **[Architecture](./architecture.md)**: The high-level block diagram of the system (API -> Core -> Local -> Remote).
*   **[Query Lifecycle](./query-lifecycle.md)**: The state machine of a query. **Read this** to understand how querying and offline capabilities work.

### Subsystem Deep Dives
*   **[Persistence Schema](./persistence-schema.md)**: A reference guide for the IndexedDB tables (e.g., `remote_documents`, `mutation_queues`).
*   **[Query Execution](./query-execution.md)**: Details on the algorithms used by the Local Store to execute queries (Index Scans vs. Full Collection Scans).
*   **[Bundles](./bundles.md)**: How the SDK loads and processes data bundles.

### Developer Guides
*   **[Code Layout](./code-layout.md)**: Maps the architectural components to specific source files and directories.
*   **[Build Process](./build.md)**: How to build the artifacts.
*   **[Testing](./testing.md)**: How to run unit and integration tests.
*   **[Contributing](../CONTRIBUTING.md)**: How to run unit and integration tests.
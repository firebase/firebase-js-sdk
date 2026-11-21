# SDK Architecture

This document provides a detailed explanation of the Firestore JavaScript SDK's architecture, its core components, and the flow of data through the system.

## Core Components

The SDK is composed of several key components that work together to provide the full range of Firestore features.

![Architecture Diagram](./architecture.png)

*   **API Layer**: The public-facing API surface that developers use to interact with the SDK. This layer is responsible for translating the public API calls into the internal data models and passing them to the appropriate core components.
*   **Core**:
    *   **Event Manager**: Acts as a central hub for all eventing in the SDK. It is responsible for routing events between the API Layer and Sync Engine. It manages query listeners and is responsible for raising snapshot events, as well as handling connectivity changes and some query failures.
*   **Sync Engine**: The central controller of the SDK. It acts as the glue between the Event Manager, Local Store, and Remote Store.
    *   **Target**: The backend protocol's internal representation of a recurring Query. While a `Query` is a user-intent (e.g., "users where age > 18"), a `Target` is the allocated stream ID (`Target ID`) that the Watch implementation uses to track that query's state over the network. The **Coordinator** maps ephemeral user Queries to stable system Targets.
    *   **Coordinator**: It bridges the **User World** (Query) and **System World** (Target), converting public API calls into internal `Target IDs`.
    *   **View Construction**: It manages the user-facing view using the formula: `View = Remote Document + Overlay`.
        *   **Remote Document**: The authoritative state from the backend.
        *   **Overlay**: A computed delta representing pending local mutations.
    *   **Limbo Resolution**: It detects "Limbo" documents (local matches not confirmed by server) and initiates resolution flows to verify their existence.
    *   **Lifecycle Management**: It controls the [Query Lifecycle](./query-lifecycle.md), managing the initialization of streams, the persistence of data, and garbage collection eligibility.
*   **Local Store**: A container for the components that manage persisted and in-memory data.
    *   **Remote Document Cache**: A cache of the most recent version of documents as known by the Firestore backend (A.K.A. Remote Documents).
    *   **Mutation Queue**: A queue of all the user-initiated writes (set, update, delete) that have not yet been acknowledged by the Firestore backend.
    *   **Local View**: A cache that represents the user's current view of the data, combining the Remote Document Cache with the Mutation Queue.
    *   **Query Engine**: Determines the most efficient strategy (Index vs. Scan) to identify documents matching a query in the local cache.
    *   **Overlays**: A performance-optimizing cache that stores the calculated effect of pending mutations from the Mutation Queue on documents. Instead of re-applying mutations every time a document is read, the SDK computes this "overlay" once and caches it, allowing the Local View to be constructed more efficiently.
    * For a detailed breakdown of the IndexedDB structure and tables, see [Persistence Schema](./persistence-schema.md).
*   **Remote Store**: The component responsible for all network communication with the Firestore backend.
    *   It manages the **[Watch System](./watch.md)** for reading, writing, and listening to realtime updates.
    *   It manages the gRPC streams for all network operations.
    *   It abstracts away the complexities of the network protocol from the rest of the SDK.
*   **Persistence Layer**: The underlying storage mechanism used by the Local Store to persist data on the client. In the browser, this is implemented using IndexedDB.

The architecture and systems within the SDK map closely to the directory structure, which helps developers navigate the codebase. Here is a mapping of the core components to their corresponding directories.

*   `src/`:
    *   `api/`: Implements the **API Layer** for the main SDK.
    *   `lite-api/`: Implements the **API Layer** for the lite SDK.
    *   `core/`: Implements the **Sync Engine** and **Event Manager**.
    *   `local/`: Implements the **Local Store**, which includes the **Mutation Queue**, **Remote Document Cache**, **Local View**, and the **Persistence Layer**.
    *   `remote/`: Implements the **Remote Store**, handling all network communication.

For a more detailed explanation of the contents of each directory, see the [Code Layout](./code-layout.md) documentation.


# Data Flow

Here's a step-by-step walkthrough of how data flows through the SDK for a write operation, referencing the core components.

## Write Data Flow

1.  **API Layer**: A user initiates a write operation (e.g., `setDoc`, `updateDoc`, `deleteDoc`).
2.  **Sync Engine**: The call is routed to the Sync Engine, which wraps the operation in a "mutation".
3.  **Mutation Queue (in Local Store)**: The Sync Engine adds this mutation to the Mutation Queue. The queue is persisted to the **Persistence Layer** (IndexedDB). At this point, the SDK "optimistically" considers the write successful locally.
4.  **Local View (in Local Store)**: The change is immediately reflected in the Local View, making it available to any active listeners without waiting for backend confirmation.
5.  **Remote Store**: The Sync Engine notifies the Remote Store that there are pending mutations.
6.  **Backend**: The Remote Store sends the mutations from the queue to the Firestore backend.
7.  **Acknowledgement**: The backend acknowledges the write.
8.  **Mutation Queue (in Local Store)**: The Remote Store informs the Sync Engine, which then removes the acknowledged mutation from the Mutation Queue.

## Read Data Flow (with a Real-Time Listener)

1.  **API Layer**: A user attaches a listener to a query (e.g., `onSnapshot`).
2.  **Event Manager**: The Event Manager creates a listener and passes it to the Sync Engine.
3.  **Sync Engine**: The Sync Engine creates a "view" for the query.
4.  **Local View (in Local Store)**: The Sync Engine asks the Query Engine in the Local Store to execute the query. The Query Engine selects a strategy (e.g., Index Scan or Timestamp Optimization) to find matching keys. The Local Store then constructs the documents by applying cached Overlays on top of Remote Documents.
5.  **API Layer**: The initial data from the Local View is sent back to the user's `onSnapshot` callback. This provides a fast, initial result.
6.  **Remote Store**: Simultaneously, the Sync Engine instructs the Remote Store to listen to the query on the Firestore backend.
7.  **Backend**: The backend returns the initial matching documents for the query.
8.  **Remote Document Cache (in Local Store)**: The Remote Store receives the documents and saves them to the Remote Document Cache in the Local Store, overwriting any previously cached versions of those documents.
9.  **Sync Engine**: The Sync Engine is notified of the updated documents. It re-calculates the query view by combining the new data from the Remote Document Cache with any applicable pending mutations from the **Mutation Queue**.
10. **API Layer**: If the query results have changed after this reconciliation, the new results are sent to the user's `onSnapshot` callback. This is why a listener may fire twice initially.
11. **Real-time Updates**: From now on, any changes on the backend that affect the query are pushed to the Remote Store, which updates the Remote Document Cache, triggering the Sync Engine to re-calculate the view and notify the listener.

**Note on Query Lifecycle:** The steps above describe the "Happy Path" of a query starting up. For details on how queries are deduplicated, how the data persists after a listener is removed, and how Garbage Collection eventually cleans it up, see the [Query Lifecycle](query-lifecycle.md).
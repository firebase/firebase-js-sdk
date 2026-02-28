# SDK Code Layout

This document explains the code layout in this repository. It is closely related to the [architecture](./architecture.md).

*   `src/`: Contains the source code for the main `@firebase/firestore` package.
    *   `api/`: **API Surface**. Implements the public API (e.g., `doc`, `collection`, `onSnapshot`).
        *   `database.ts`: The entry point for the `Firestore` class.
        *   `reference.ts`: Implements `DocumentReference` and `CollectionReference`.
    *   `core/`: **Sync Engine**. Contains the high-level orchestration logic.
        *   `sync_engine.ts`: The central coordinator. It manages the "User World" <-> "System World" bridge, `TargetID` allocation, and the main async queue.
        *   `event_manager.ts`: Handles `QueryListener` registration, fan-out (deduplication of identical queries), and raising snapshot events to the user.
        *   `query.ts`: Defines the internal `Query` and `Target` models.
        *   `firestore_client.ts`: The initialization logic that wires up the components.
    *   `local/`: **Storage and Query Execution**. Manages persistence, caching, and local execution.
        *   `local_store.ts`: The main interface for the Core layer to interact with storage. It coordinates the components below.
        *   `indexeddb_persistence.ts`: The implementation of the [Persistence Schema](./persistence-schema.md) using IndexedDB.
        *   `local_documents_view.ts`: Implements the logic to assemble the user-facing view (`RemoteDoc` + `Mutation`).
        *   `query_engine.ts`: The optimizer that decides how to scan the cache.
        *   `lru_garbage_collector.ts` & `reference_delegate.ts`: Implements the Sequence Number logic to clean up old data.
    *   `remote/`: **Network**. Handles gRPC/REST communication.
        *   `remote_store.ts`: Manages the "Watch Stream" (listening to queries) and the "Commit Stream" (sending mutations).
        *   `connection.ts`: Abstracts the underlying networking transport.
        *   `serializer.ts`: Converts between internal model objects and the Protobuf format used by the backend.
    *   `model/`: Defines the immutable data structures used throughout the SDK (e.g., `DocumentKey`, `FieldPath`, `Mutation`).
    *   `util/`: General purpose utilities (AsyncQueue, Assertions, Types).
*   `lite/`: Defines the entrypoint code for the `@firebase/firestore/lite` package.
*   `test/`: Contains all unit and integration tests for the SDK. The tests are organized by component and feature, and they are essential for ensuring the quality and correctness of the code.
*   `scripts/`: Contains a collection of build and maintenance scripts used for tasks such as bundling the code, running tests, and generating documentation.

TODO: Add more detailed information as appropriate on each folder

TODO: Mention critical entry points
    - `package.json` for packages and common commands. Go to [build.md](./build.md) for details
    - rollup configs for main and lite sdks. Go to [build.md](./build.md) for details
    - tests entry points. Go to [testing.md](./testing.md) for details
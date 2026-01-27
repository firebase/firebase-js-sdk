# Spec Tests (Cross-Platform Verification)

Spec Tests are the backbone of the Firestore SDK's correctness strategy. They are a suite of deterministic, data-driven tests that verify the behavior of the **Sync Engine**, **Local Store**, and **Event Manager** without connecting to a real backend.

## The "Sandwich" Architecture

Spec tests operate by mocking the edges of the SDK while running the core logic for real.

1.  **Mocked Top (API Layer)**: instead of user code calling `doc.set()`, the test runner injects "User Actions" directly into the Event Manager/Sync Engine.
2.  **Real Middle (Core)**: The Sync Engine, Local Store, Query Engine, and Garbage Collector run exactly as they do in production.
3.  **Mocked Bottom (Remote Store)**: The network layer (gRPC/REST) is mocked out. The test runner intercepts outgoing writes and injects incoming Watch Stream events (snapshots, acks).

This allows us to simulate complex race conditions—such as a Write Acknowledgment arriving exactly when a Watch Snapshot is processing—that are impossible to reproduce reliably in a real integration test.

## Cross-Platform Consistency

A unique feature of the Firestore SDKs is that they share logic tests across platforms (JavaScript, Android, iOS).

*   **Source of Truth**: The tests are written in **TypeScript** within the JavaScript SDK repository.
*   **Compilation**: A build script runs the TS tests in a special mode that exports the steps and expectations into **JSON files**.
*   **Consumption**: The Android and iOS SDKs ingest these JSON files and run them using their own platform-specific Test Runners.

This ensures that if a query behaves a certain way on the Web, it behaves *exactly* the same on an iPhone or Android device.

## Anatomy of a Spec Test

A spec test consists of a sequence of **Steps**. Each step performs an action or asserts a state.

```typescript
specTest('Local writes are visible immediately', [], () => {
  // Step 1: User sets a document
  userSets('collection/key', { foo: 'bar' });

  // Step 2: Expect an event (Optimistic update)
  expectEvents({
    acknowledgedDocs: ['collection/key'],
    events: [{ type: 'added', doc: 'collection/key' }]
  });

  // Step 3: Network acknowledges the write
  writeAcks(1); // Ack version 1

  // Step 4: Watch stream sends the confirmed data
  watchSends({ affects: ['collection/key'] }, ...);
});

### Key Helpers
*   `userListens(query)`: Simulates a user calling `onSnapshot`.
*   `userSets(key, val)`: Simulates a user write.
*   `watchSends(snapshot)`: Simulates the backend sending data over the Watch stream.
*   `expectEvents(events)`: Asserts that the Event Manager emitted specific snapshots to the user.

## Configuration & Tags

Spec tests can be configured to run only in specific environments using **Tags**.

*   `multi-client`: Runs the test in a multi-tab environment (simulating IndexedDB concurrency).
*   `eager-gc`: Runs only when Garbage Collection is set to Eager (Memory persistence).
*   `durable-persistence`: Runs only when using IndexedDB/SQLite.
*   `exclusive`: **Debug Tool**. If you add this tag to a test, the runner will skip all other tests and only run this one. This is critical for debugging because the sheer volume of spec tests makes logs unreadable otherwise.

## Debugging Spec Tests

Debugging spec tests can be challenging because the code you are stepping through is often the *Test Runner* interpreting the JSON, rather than the test logic itself.

1.  **Use `exclusive`**: Always isolate the failing test.
2.  **Trace the Helper**: If `userListens` fails, set a breakpoint in the `spec_test_runner.ts` implementation of that step to see how it interacts with the Sync Engine.
3.  **Check Persistence**: Remember that spec tests usually run twice: once with Memory Persistence and once with IndexedDB. A failure might only happen in one mode.


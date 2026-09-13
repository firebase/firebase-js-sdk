# Transaction Lifecycle & Mechanics

This document details the internal implementation of Transactions in the Firestore JavaScript SDK. It is a key component of the [Remote Store](./architecture.md#remote-store).

Unlike standard writes, which use the [Write Lifecycle](./write-lifecycle.md) (Mutation Queue, Overlays, Sync Engine), Transactions are **online-only** operations that communicate directly with the backend.

## Optimistic vs. Pessimistic Concurrency

It is critical to distinguish how the Client-Side SDKs (JS, Android, iOS) handle transactions versus the Server-Side SDKs (Node.js, Java, Go, etc.).

*   **Server SDKs (Pessimistic Locking)**:
    1.  Call `BeginTransaction` RPC. Backend returns a `TransactionID`.
    2.  Reads hold a **Lock** on the documents on the server.
    3.  Other clients cannot modify these documents until the transaction commits or times out.
    4.  Writes are committed using the `TransactionID`.

*   **JavaScript / Mobile SDKs (Optimistic Concurrency)**:
    1.  **No Locks**: The SDK reads documents without acquiring a server-side lock.
    2.  **Preconditions**: When committing, the SDK sends the writes along with a **Precondition** (usually the `updateTime` of the document version that was read).
    3.  **Verification**: The backend verifies that the documents have not changed since they were read. If they have, the transaction fails.
    4.  **Retry**: The SDK automatically retries the transaction function with exponential backoff.

### Why Optimistic?
Mobile and Web clients have unreliable network connectivity. If a client acquired a Pessimistic Lock and then lost connectivity, that lock would block all other writers to that document until it timed out. Optimistic concurrency ensures that a single flaky client cannot paralyze the system for others.

## The Transaction Lifecycle

Because transactions bypass the `LocalStore` and `SyncEngine`, they do not persist data to IndexedDB during execution.

### 1. Execution
The `runTransaction` function accepts an `updateFunction`. This function is executed repeatedly until success or a non-retriable error occurs.

### 2. Reads (`get`)
When a user reads a document inside a transaction:
*   **Bypasses Cache**: The SDK does *not* look in **Remote Document Cache** or **Mutation Queue** (local writes). It forces a network fetch.
*   **RPC**: It uses the `BatchGetDocuments` RPC.
*   **No Transaction ID**: Unlike server SDKs, the `BatchGetDocuments` request does **not** include a Transaction ID. It is a standard read.
*   **Versioning**: The SDK records the `updateTime` and `key` of every document read. These will be used later for verification.

### 3. Writes (`set`, `update`, `delete`)
Writes are not sent to the network immediately. They are buffered in memory within the `Transaction` object.
*   **Validation**: The SDK enforces the rule that **all reads must occur before any writes**. Once a write is buffered, the SDK throws an error if a subsequent read is attempted.

### 4. Commit
When the `updateFunction` completes successfully, the SDK attempts to commit.
*   **RPC**: It uses the `Commit` RPC (a single atomic batch).
*   **Preconditions**: For every document that was read and is now being written to (or verified), the SDK attaches a `Precondition`.
    *   *Example*: "Only update `doc/A` if its `updateTime` is still `Timestamp(123)`."
*   **Verify Mutations**: If a document was read but *not* modified, the SDK still needs to ensure it didn't change (as it might have influenced the business logic). The SDK adds a specific `VerifyMutation` to the commit batch, which performs a precondition check without modifying data.

### 5. Backend Response
*   **Success**: The backend applies all writes atomically. The SDK returns the result to the user.
*   **Failure (Precondition Failed)**: This indicates contention (another client modified a document). The SDK captures this specific error code.
*   **Retry**: If the error is retriable (Precondition Failed, Aborted), the SDK waits for a backoff period and then **re-runs the `updateFunction` from the start**. This requires re-fetching the fresh documents.

## Architectural Bypass

Transactions utilize a dedicated pathway in the `RemoteStore`/`Datastore` layer.


1.  **API Layer**: The user calls `runTransaction`.
2.  **Core**: The **Transaction Runner** manages the retry loop and backoff.
3.  **Remote Store**:
    *   Standard queries use the **Watch Stream** (long-lived connection).
    *   Standard writes use the **Write Stream** (requires the local Mutation Queue).
    *   **Transactions** use direct **Unary RPCs** (`BatchGetDocuments` and `Commit`) via the underlying Datastore layer.

> [!WARNING]
> **Consistency Warning**: Transactions use a different endpoint (`runTransaction`) than the standard `Listen` (Watch) system. As a result, they **do not** guarantee consistency with the Watch stream. A write committed via Watch might not be immediately visible to a transaction, and vice versa, due to the distributed nature of the backend.

## Constraints

*   **Online Only**: Because they bypass the local cache and require server-side verification, transactions require an active network connection. They will fail if the client is offline.
*   **Read-Your-Writes**: Within the scope of the transaction function, the SDK does not update the local cache with the pending writes. However, the transaction object tracks local changes to ensure that if you write to `DocA` and then read `DocA` (which is illegal in the public API, but conceptually relevant), you would see the change.
*   **5 Retry Limit**: To prevent infinite loops during high contention, the SDK caps retries at 5 attempts.
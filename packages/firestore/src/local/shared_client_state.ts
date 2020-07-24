/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { User } from '../auth/user';
import { ListenSequence } from '../core/listen_sequence';
import {
  BatchId,
  ListenSequenceNumber,
  MutationBatchState,
  OnlineState,
  TargetId
} from '../core/types';
import { TargetIdSet, targetIdSet } from '../model/collections';
import { hardAssert, debugAssert } from '../util/assert';
import { AsyncQueue } from '../util/async_queue';
import { Code, FirestoreError } from '../util/error';
import { logError, logDebug } from '../util/log';
import { SortedSet } from '../util/sorted_set';
import { SortedMap } from '../util/sorted_map';
import { primitiveComparator } from '../util/misc';
import { isSafeInteger, WindowLike } from '../util/types';
import {
  QueryTargetState,
  SharedClientStateSyncer
} from './shared_client_state_syncer';
import {
  CLIENT_STATE_KEY_PREFIX,
  ClientStateSchema,
  createWebStorageClientStateKey,
  createWebStorageMutationBatchKey,
  createWebStorageOnlineStateKey,
  createWebStorageQueryTargetMetadataKey,
  createWebStorageSequenceNumberKey,
  MUTATION_BATCH_KEY_PREFIX,
  MutationMetadataSchema,
  QUERY_TARGET_KEY_PREFIX,
  QueryTargetStateSchema,
  SharedOnlineStateSchema
} from './shared_client_state_schema';

const LOG_TAG = 'SharedClientState';

/**
 * A randomly-generated key assigned to each Firestore instance at startup.
 */
export type ClientId = string;

/**
 * A `SharedClientState` keeps track of the global state of the mutations
 * and query targets for all active clients with the same persistence key (i.e.
 * project ID and FirebaseApp name). It relays local changes to other clients
 * and updates its local state as new state is observed.
 *
 * `SharedClientState` is primarily used for synchronization in Multi-Tab
 * environments. Each tab is responsible for registering its active query
 * targets and mutations. `SharedClientState` will then notify the listener
 * assigned to `.syncEngine` for updates to mutations and queries that
 * originated in other clients.
 *
 * To receive notifications, `.syncEngine` and `.onlineStateHandler` has to be
 * assigned before calling `start()`.
 */
export interface SharedClientState {
  onlineStateHandler: ((onlineState: OnlineState) => void) | null;
  sequenceNumberHandler:
    | ((sequenceNumber: ListenSequenceNumber) => void)
    | null;

  /** Registers the Mutation Batch ID of a newly pending mutation. */
  addPendingMutation(batchId: BatchId): void;

  /**
   * Records that a pending mutation has been acknowledged or rejected.
   * Called by the primary client to notify secondary clients of mutation
   * results as they come back from the backend.
   */
  updateMutationState(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void;

  /**
   * Associates a new Query Target ID with the local Firestore client. Returns
   * the new query state for the query (which can be 'current' if the query is
   * already associated with another tab).
   *
   * If the target id is already associated with local client, the method simply
   * returns its `QueryTargetState`.
   */
  addLocalQueryTarget(targetId: TargetId): QueryTargetState;

  /** Removes the Query Target ID association from the local client. */
  removeLocalQueryTarget(targetId: TargetId): void;

  /** Checks whether the target is associated with the local client. */
  isLocalQueryTarget(targetId: TargetId): boolean;

  /**
   * Processes an update to a query target.
   *
   * Called by the primary client to notify secondary clients of document
   * changes or state transitions that affect the provided query target.
   */
  updateQueryState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void;

  /**
   * Removes the target's metadata entry.
   *
   * Called by the primary client when all clients stopped listening to a query
   * target.
   */
  clearQueryState(targetId: TargetId): void;

  /**
   * Gets the active Query Targets IDs for all active clients.
   *
   * The implementation for this may require O(n) runtime, where 'n' is the size
   * of the result set.
   */
  // Visible for testing
  getAllActiveQueryTargets(): SortedSet<TargetId>;

  /**
   * Checks whether the provided target ID is currently being listened to by
   * any of the active clients.
   *
   * The implementation may require O(n*log m) runtime, where 'n' is the number
   * of clients and 'm' the number of targets.
   */
  isActiveQueryTarget(targetId: TargetId): boolean;

  /**
   * Starts the SharedClientState, reads existing client data and registers
   * listeners for updates to new and existing clients.
   */
  start(): Promise<void>;

  /** Shuts down the `SharedClientState` and its listeners. */
  shutdown(): void;

  /**
   * Changes the active user and removes all existing user-specific data. The
   * user change does not call back into SyncEngine (for example, no mutations
   * will be marked as removed).
   */
  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void;

  /** Changes the shared online state of all clients. */
  setOnlineState(onlineState: OnlineState): void;

  writeSequenceNumber(sequenceNumber: ListenSequenceNumber): void;
}

/**
 * Holds the state of a mutation batch, including its user ID, batch ID and
 * whether the batch is 'pending', 'acknowledged' or 'rejected'.
 */
// Visible for testing
export class MutationMetadata {
  constructor(
    readonly user: User,
    readonly batchId: BatchId,
    readonly state: MutationBatchState,
    readonly error?: FirestoreError
  ) {
    debugAssert(
      (error !== undefined) === (state === 'rejected'),
      `MutationMetadata must contain an error iff state is 'rejected'`
    );
  }

  /**
   * Parses a MutationMetadata from its JSON representation in WebStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromWebStorageEntry(
    user: User,
    batchId: BatchId,
    value: string
  ): MutationMetadata | null {
    const mutationBatch = JSON.parse(value) as MutationMetadataSchema;

    let validData =
      typeof mutationBatch === 'object' &&
      ['pending', 'acknowledged', 'rejected'].indexOf(mutationBatch.state) !==
        -1 &&
      (mutationBatch.error === undefined ||
        typeof mutationBatch.error === 'object');

    let firestoreError: FirestoreError | undefined = undefined;

    if (validData && mutationBatch.error) {
      validData =
        typeof mutationBatch.error.message === 'string' &&
        typeof mutationBatch.error.code === 'string';
      if (validData) {
        firestoreError = new FirestoreError(
          mutationBatch.error.code as Code,
          mutationBatch.error.message
        );
      }
    }

    if (validData) {
      return new MutationMetadata(
        user,
        batchId,
        mutationBatch.state,
        firestoreError
      );
    } else {
      logError(
        LOG_TAG,
        `Failed to parse mutation state for ID '${batchId}': ${value}`
      );
      return null;
    }
  }

  toWebStorageJSON(): string {
    const batchMetadata: MutationMetadataSchema = {
      state: this.state,
      updateTimeMs: Date.now() // Modify the existing value to trigger update.
    };

    if (this.error) {
      batchMetadata.error = {
        code: this.error.code,
        message: this.error.message
      };
    }

    return JSON.stringify(batchMetadata);
  }
}

/**
 * Holds the state of a query target, including its target ID and whether the
 * target is 'not-current', 'current' or 'rejected'.
 */
// Visible for testing
export class QueryTargetMetadata {
  constructor(
    readonly targetId: TargetId,
    readonly state: QueryTargetState,
    readonly error?: FirestoreError
  ) {
    debugAssert(
      (error !== undefined) === (state === 'rejected'),
      `QueryTargetMetadata must contain an error iff state is 'rejected'`
    );
  }

  /**
   * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromWebStorageEntry(
    targetId: TargetId,
    value: string
  ): QueryTargetMetadata | null {
    const targetState = JSON.parse(value) as QueryTargetStateSchema;

    let validData =
      typeof targetState === 'object' &&
      ['not-current', 'current', 'rejected'].indexOf(targetState.state) !==
        -1 &&
      (targetState.error === undefined ||
        typeof targetState.error === 'object');

    let firestoreError: FirestoreError | undefined = undefined;

    if (validData && targetState.error) {
      validData =
        typeof targetState.error.message === 'string' &&
        typeof targetState.error.code === 'string';
      if (validData) {
        firestoreError = new FirestoreError(
          targetState.error.code as Code,
          targetState.error.message
        );
      }
    }

    if (validData) {
      return new QueryTargetMetadata(
        targetId,
        targetState.state,
        firestoreError
      );
    } else {
      logError(
        LOG_TAG,
        `Failed to parse target state for ID '${targetId}': ${value}`
      );
      return null;
    }
  }

  toWebStorageJSON(): string {
    const targetState: QueryTargetStateSchema = {
      state: this.state,
      updateTimeMs: Date.now() // Modify the existing value to trigger update.
    };

    if (this.error) {
      targetState.error = {
        code: this.error.code,
        message: this.error.message
      };
    }

    return JSON.stringify(targetState);
  }
}

/**
 * Metadata state of a single client denoting the query targets it is actively
 * listening to.
 */
// Visible for testing.
export interface ClientState {
  readonly activeTargetIds: TargetIdSet;
}

/**
 * This class represents the immutable ClientState for a client read from
 * WebStorage, containing the list of active query targets.
 */
class RemoteClientState implements ClientState {
  private constructor(
    readonly clientId: ClientId,
    readonly activeTargetIds: TargetIdSet
  ) {}

  /**
   * Parses a RemoteClientState from the JSON representation in WebStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromWebStorageEntry(
    clientId: ClientId,
    value: string
  ): RemoteClientState | null {
    const clientState = JSON.parse(value) as ClientStateSchema;

    let validData =
      typeof clientState === 'object' &&
      clientState.activeTargetIds instanceof Array;

    let activeTargetIdsSet = targetIdSet();

    for (let i = 0; validData && i < clientState.activeTargetIds.length; ++i) {
      validData = isSafeInteger(clientState.activeTargetIds[i]);
      activeTargetIdsSet = activeTargetIdsSet.add(
        clientState.activeTargetIds[i]
      );
    }

    if (validData) {
      return new RemoteClientState(clientId, activeTargetIdsSet);
    } else {
      logError(
        LOG_TAG,
        `Failed to parse client data for instance '${clientId}': ${value}`
      );
      return null;
    }
  }
}

/**
 * This class represents the online state for all clients participating in
 * multi-tab. The online state is only written to by the primary client, and
 * used in secondary clients to update their query views.
 */
export class SharedOnlineState {
  constructor(readonly clientId: string, readonly onlineState: OnlineState) {}

  /**
   * Parses a SharedOnlineState from its JSON representation in WebStorage.
   * Logs a warning and returns null if the format of the data is not valid.
   */
  static fromWebStorageEntry(value: string): SharedOnlineState | null {
    const onlineState = JSON.parse(value) as SharedOnlineStateSchema;

    const validData =
      typeof onlineState === 'object' &&
      ['Unknown', 'Online', 'Offline'].indexOf(onlineState.onlineState) !==
        -1 &&
      typeof onlineState.clientId === 'string';

    if (validData) {
      return new SharedOnlineState(
        onlineState.clientId,
        onlineState.onlineState as OnlineState
      );
    } else {
      logError(LOG_TAG, `Failed to parse online state: ${value}`);
      return null;
    }
  }
}

/**
 * Metadata state of the local client. Unlike `RemoteClientState`, this class is
 * mutable and keeps track of all pending mutations, which allows us to
 * update the range of pending mutation batch IDs as new mutations are added or
 * removed.
 *
 * The data in `LocalClientState` is not read from WebStorage and instead
 * updated via its instance methods. The updated state can be serialized via
 * `toWebStorageJSON()`.
 */
// Visible for testing.
export class LocalClientState implements ClientState {
  activeTargetIds = targetIdSet();

  addQueryTarget(targetId: TargetId): void {
    this.activeTargetIds = this.activeTargetIds.add(targetId);
  }

  removeQueryTarget(targetId: TargetId): void {
    this.activeTargetIds = this.activeTargetIds.delete(targetId);
  }

  /**
   * Converts this entry into a JSON-encoded format we can use for WebStorage.
   * Does not encode `clientId` as it is part of the key in WebStorage.
   */
  toWebStorageJSON(): string {
    const data: ClientStateSchema = {
      activeTargetIds: this.activeTargetIds.toArray(),
      updateTimeMs: Date.now() // Modify the existing value to trigger update.
    };
    return JSON.stringify(data);
  }
}

/**
 * `WebStorageSharedClientState` uses WebStorage (window.localStorage) as the
 * backing store for the SharedClientState. It keeps track of all active
 * clients and supports modifications of the local client's data.
 */
export class WebStorageSharedClientState implements SharedClientState {
  syncEngine: SharedClientStateSyncer | null = null;
  onlineStateHandler: ((onlineState: OnlineState) => void) | null = null;
  sequenceNumberHandler:
    | ((sequenceNumber: ListenSequenceNumber) => void)
    | null = null;

  private readonly storage: Storage;
  private readonly localClientStorageKey: string;
  private readonly sequenceNumberKey: string;
  private readonly storageListener = this.handleWebStorageEvent.bind(this);
  private readonly onlineStateKey: string;
  private readonly clientStateKeyRe: RegExp;
  private readonly mutationBatchKeyRe: RegExp;
  private readonly queryTargetKeyRe: RegExp;
  private activeClients = new SortedMap<string, ClientState>(
    primitiveComparator
  );
  private started = false;
  private currentUser: User;

  /**
   * Captures WebStorage events that occur before `start()` is called. These
   * events are replayed once `WebStorageSharedClientState` is started.
   */
  private earlyEvents: StorageEvent[] = [];

  constructor(
    private readonly window: WindowLike,
    private readonly queue: AsyncQueue,
    private readonly persistenceKey: string,
    private readonly localClientId: ClientId,
    initialUser: User
  ) {
    // Escape the special characters mentioned here:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    const escapedPersistenceKey = persistenceKey.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    this.storage = this.window.localStorage;
    this.currentUser = initialUser;
    this.localClientStorageKey = createWebStorageClientStateKey(
      this.persistenceKey,
      this.localClientId
    );
    this.sequenceNumberKey = createWebStorageSequenceNumberKey(
      this.persistenceKey
    );
    this.activeClients = this.activeClients.insert(
      this.localClientId,
      new LocalClientState()
    );

    this.clientStateKeyRe = new RegExp(
      `^${CLIENT_STATE_KEY_PREFIX}_${escapedPersistenceKey}_([^_]*)$`
    );
    this.mutationBatchKeyRe = new RegExp(
      `^${MUTATION_BATCH_KEY_PREFIX}_${escapedPersistenceKey}_(\\d+)(?:_(.*))?$`
    );
    this.queryTargetKeyRe = new RegExp(
      `^${QUERY_TARGET_KEY_PREFIX}_${escapedPersistenceKey}_(\\d+)$`
    );

    this.onlineStateKey = createWebStorageOnlineStateKey(this.persistenceKey);

    // Rather than adding the storage observer during start(), we add the
    // storage observer during initialization. This ensures that we collect
    // events before other components populate their initial state (during their
    // respective start() calls). Otherwise, we might for example miss a
    // mutation that is added after LocalStore's start() processed the existing
    // mutations but before we observe WebStorage events.
    this.window.addEventListener('storage', this.storageListener);
  }

  /** Returns 'true' if WebStorage is available in the current environment. */
  static isAvailable(window: WindowLike | null): window is WindowLike {
    return !!(window && window.localStorage);
  }

  async start(): Promise<void> {
    debugAssert(!this.started, 'WebStorageSharedClientState already started');
    debugAssert(
      this.syncEngine !== null,
      'syncEngine property must be set before calling start()'
    );
    debugAssert(
      this.onlineStateHandler !== null,
      'onlineStateHandler property must be set before calling start()'
    );

    // Retrieve the list of existing clients to backfill the data in
    // SharedClientState.
    const existingClients = await this.syncEngine!.getActiveClients();

    for (const clientId of existingClients) {
      if (clientId === this.localClientId) {
        continue;
      }

      const storageItem = this.getItem(
        createWebStorageClientStateKey(this.persistenceKey, clientId)
      );
      if (storageItem) {
        const clientState = RemoteClientState.fromWebStorageEntry(
          clientId,
          storageItem
        );
        if (clientState) {
          this.activeClients = this.activeClients.insert(
            clientState.clientId,
            clientState
          );
        }
      }
    }

    this.persistClientState();

    // Check if there is an existing online state and call the callback handler
    // if applicable.
    const onlineStateJSON = this.storage.getItem(this.onlineStateKey);
    if (onlineStateJSON) {
      const onlineState = this.fromWebStorageOnlineState(onlineStateJSON);
      if (onlineState) {
        this.handleOnlineStateEvent(onlineState);
      }
    }

    for (const event of this.earlyEvents) {
      this.handleWebStorageEvent(event);
    }

    this.earlyEvents = [];

    // Register a window unload hook to remove the client metadata entry from
    // WebStorage even if `shutdown()` was not called.
    this.window.addEventListener('unload', () => this.shutdown());

    this.started = true;
  }

  writeSequenceNumber(sequenceNumber: ListenSequenceNumber): void {
    this.setItem(this.sequenceNumberKey, JSON.stringify(sequenceNumber));
  }

  getAllActiveQueryTargets(): TargetIdSet {
    return this.extractActiveQueryTargets(this.activeClients);
  }

  isActiveQueryTarget(targetId: TargetId): boolean {
    let found = false;
    this.activeClients.forEach((key, value) => {
      if (value.activeTargetIds.has(targetId)) {
        found = true;
      }
    });
    return found;
  }

  addPendingMutation(batchId: BatchId): void {
    this.persistMutationState(batchId, 'pending');
  }

  updateMutationState(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void {
    this.persistMutationState(batchId, state, error);

    // Once a final mutation result is observed by other clients, they no longer
    // access the mutation's metadata entry. Since WebStorage replays events
    // in order, it is safe to delete the entry right after updating it.
    this.removeMutationState(batchId);
  }

  addLocalQueryTarget(targetId: TargetId): QueryTargetState {
    let queryState: QueryTargetState = 'not-current';

    // Lookup an existing query state if the target ID was already registered
    // by another tab
    if (this.isActiveQueryTarget(targetId)) {
      const storageItem = this.storage.getItem(
        createWebStorageQueryTargetMetadataKey(this.persistenceKey, targetId)
      );

      if (storageItem) {
        const metadata = QueryTargetMetadata.fromWebStorageEntry(
          targetId,
          storageItem
        );
        if (metadata) {
          queryState = metadata.state;
        }
      }
    }

    this.localClientState.addQueryTarget(targetId);
    this.persistClientState();

    return queryState;
  }

  removeLocalQueryTarget(targetId: TargetId): void {
    this.localClientState.removeQueryTarget(targetId);
    this.persistClientState();
  }

  isLocalQueryTarget(targetId: TargetId): boolean {
    return this.localClientState.activeTargetIds.has(targetId);
  }

  clearQueryState(targetId: TargetId): void {
    this.removeItem(
      createWebStorageQueryTargetMetadataKey(this.persistenceKey, targetId)
    );
  }

  updateQueryState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void {
    this.persistQueryTargetState(targetId, state, error);
  }

  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void {
    removedBatchIds.forEach(batchId => {
      this.removeMutationState(batchId);
    });
    this.currentUser = user;
    addedBatchIds.forEach(batchId => {
      this.addPendingMutation(batchId);
    });
  }

  setOnlineState(onlineState: OnlineState): void {
    this.persistOnlineState(onlineState);
  }

  shutdown(): void {
    if (this.started) {
      this.window.removeEventListener('storage', this.storageListener);
      this.removeItem(this.localClientStorageKey);
      this.started = false;
    }
  }

  private getItem(key: string): string | null {
    const value = this.storage.getItem(key);
    logDebug(LOG_TAG, 'READ', key, value);
    return value;
  }

  private setItem(key: string, value: string): void {
    logDebug(LOG_TAG, 'SET', key, value);
    this.storage.setItem(key, value);
  }

  private removeItem(key: string): void {
    logDebug(LOG_TAG, 'REMOVE', key);
    this.storage.removeItem(key);
  }

  private handleWebStorageEvent(event: Event): void {
    // Note: The function is typed to take Event to be interface-compatible with
    // `Window.addEventListener`.
    const storageEvent = event as StorageEvent;
    if (storageEvent.storageArea === this.storage) {
      logDebug(LOG_TAG, 'EVENT', storageEvent.key, storageEvent.newValue);

      if (storageEvent.key === this.localClientStorageKey) {
        logError(
          'Received WebStorage notification for local change. Another client might have ' +
            'garbage-collected our state'
        );
        return;
      }

      this.queue.enqueueRetryable(async () => {
        if (!this.started) {
          this.earlyEvents.push(storageEvent);
          return;
        }

        if (storageEvent.key === null) {
          return;
        }

        if (this.clientStateKeyRe.test(storageEvent.key)) {
          if (storageEvent.newValue != null) {
            const clientState = this.fromWebStorageClientState(
              storageEvent.key,
              storageEvent.newValue
            );
            if (clientState) {
              return this.handleClientStateEvent(
                clientState.clientId,
                clientState
              );
            }
          } else {
            const clientId = this.fromWebStorageClientStateKey(
              storageEvent.key
            )!;
            return this.handleClientStateEvent(clientId, null);
          }
        } else if (this.mutationBatchKeyRe.test(storageEvent.key)) {
          if (storageEvent.newValue !== null) {
            const mutationMetadata = this.fromWebStorageMutationMetadata(
              storageEvent.key,
              storageEvent.newValue
            );
            if (mutationMetadata) {
              return this.handleMutationBatchEvent(mutationMetadata);
            }
          }
        } else if (this.queryTargetKeyRe.test(storageEvent.key)) {
          if (storageEvent.newValue !== null) {
            const queryTargetMetadata = this.fromWebStorageQueryTargetMetadata(
              storageEvent.key,
              storageEvent.newValue
            );
            if (queryTargetMetadata) {
              return this.handleQueryTargetEvent(queryTargetMetadata);
            }
          }
        } else if (storageEvent.key === this.onlineStateKey) {
          if (storageEvent.newValue !== null) {
            const onlineState = this.fromWebStorageOnlineState(
              storageEvent.newValue
            );
            if (onlineState) {
              return this.handleOnlineStateEvent(onlineState);
            }
          }
        } else if (storageEvent.key === this.sequenceNumberKey) {
          debugAssert(
            !!this.sequenceNumberHandler,
            'Missing sequenceNumberHandler'
          );
          const sequenceNumber = fromWebStorageSequenceNumber(
            storageEvent.newValue
          );
          if (sequenceNumber !== ListenSequence.INVALID) {
            this.sequenceNumberHandler!(sequenceNumber);
          }
        }
      });
    }
  }

  private get localClientState(): LocalClientState {
    return this.activeClients.get(this.localClientId) as LocalClientState;
  }

  private persistClientState(): void {
    this.setItem(
      this.localClientStorageKey,
      this.localClientState.toWebStorageJSON()
    );
  }

  private persistMutationState(
    batchId: BatchId,
    state: MutationBatchState,
    error?: FirestoreError
  ): void {
    const mutationState = new MutationMetadata(
      this.currentUser,
      batchId,
      state,
      error
    );
    const mutationKey = createWebStorageMutationBatchKey(
      this.persistenceKey,
      this.currentUser,
      batchId
    );
    this.setItem(mutationKey, mutationState.toWebStorageJSON());
  }

  private removeMutationState(batchId: BatchId): void {
    const mutationKey = createWebStorageMutationBatchKey(
      this.persistenceKey,
      this.currentUser,
      batchId
    );
    this.removeItem(mutationKey);
  }

  private persistOnlineState(onlineState: OnlineState): void {
    const entry: SharedOnlineStateSchema = {
      clientId: this.localClientId,
      onlineState
    };
    this.storage.setItem(this.onlineStateKey, JSON.stringify(entry));
  }

  private persistQueryTargetState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void {
    const targetKey = createWebStorageQueryTargetMetadataKey(
      this.persistenceKey,
      targetId
    );
    const targetMetadata = new QueryTargetMetadata(targetId, state, error);
    this.setItem(targetKey, targetMetadata.toWebStorageJSON());
  }

  /**
   * Parses a client state key in WebStorage. Returns null if the key does not
   * match the expected key format.
   */
  private fromWebStorageClientStateKey(key: string): ClientId | null {
    const match = this.clientStateKeyRe.exec(key);
    return match ? match[1] : null;
  }

  /**
   * Parses a client state in WebStorage. Returns 'null' if the value could not
   * be parsed.
   */
  private fromWebStorageClientState(
    key: string,
    value: string
  ): RemoteClientState | null {
    const clientId = this.fromWebStorageClientStateKey(key);
    debugAssert(clientId !== null, `Cannot parse client state key '${key}'`);
    return RemoteClientState.fromWebStorageEntry(clientId, value);
  }

  /**
   * Parses a mutation batch state in WebStorage. Returns 'null' if the value
   * could not be parsed.
   */
  private fromWebStorageMutationMetadata(
    key: string,
    value: string
  ): MutationMetadata | null {
    const match = this.mutationBatchKeyRe.exec(key);
    debugAssert(match !== null, `Cannot parse mutation batch key '${key}'`);

    const batchId = Number(match[1]);
    const userId = match[2] !== undefined ? match[2] : null;
    return MutationMetadata.fromWebStorageEntry(
      new User(userId),
      batchId,
      value
    );
  }

  /**
   * Parses a query target state from WebStorage. Returns 'null' if the value
   * could not be parsed.
   */
  private fromWebStorageQueryTargetMetadata(
    key: string,
    value: string
  ): QueryTargetMetadata | null {
    const match = this.queryTargetKeyRe.exec(key);
    debugAssert(match !== null, `Cannot parse query target key '${key}'`);

    const targetId = Number(match[1]);
    return QueryTargetMetadata.fromWebStorageEntry(targetId, value);
  }

  /**
   * Parses an online state from WebStorage. Returns 'null' if the value
   * could not be parsed.
   */
  private fromWebStorageOnlineState(value: string): SharedOnlineState | null {
    return SharedOnlineState.fromWebStorageEntry(value);
  }

  private async handleMutationBatchEvent(
    mutationBatch: MutationMetadata
  ): Promise<void> {
    if (mutationBatch.user.uid !== this.currentUser.uid) {
      logDebug(
        LOG_TAG,
        `Ignoring mutation for non-active user ${mutationBatch.user.uid}`
      );
      return;
    }

    return this.syncEngine!.applyBatchState(
      mutationBatch.batchId,
      mutationBatch.state,
      mutationBatch.error
    );
  }

  private handleQueryTargetEvent(
    targetMetadata: QueryTargetMetadata
  ): Promise<void> {
    return this.syncEngine!.applyTargetState(
      targetMetadata.targetId,
      targetMetadata.state,
      targetMetadata.error
    );
  }

  private handleClientStateEvent(
    clientId: ClientId,
    clientState: RemoteClientState | null
  ): Promise<void> {
    const updatedClients = clientState
      ? this.activeClients.insert(clientId, clientState)
      : this.activeClients.remove(clientId);

    const existingTargets = this.extractActiveQueryTargets(this.activeClients);
    const newTargets = this.extractActiveQueryTargets(updatedClients);

    const addedTargets: TargetId[] = [];
    const removedTargets: TargetId[] = [];

    newTargets.forEach(targetId => {
      if (!existingTargets.has(targetId)) {
        addedTargets.push(targetId);
      }
    });

    existingTargets.forEach(targetId => {
      if (!newTargets.has(targetId)) {
        removedTargets.push(targetId);
      }
    });

    return this.syncEngine!.applyActiveTargetsChange(
      addedTargets,
      removedTargets
    ).then(() => {
      this.activeClients = updatedClients;
    });
  }

  private handleOnlineStateEvent(onlineState: SharedOnlineState): void {
    // We check whether the client that wrote this online state is still active
    // by comparing its client ID to the list of clients kept active in
    // IndexedDb. If a client does not update their IndexedDb client state
    // within 5 seconds, it is considered inactive and we don't emit an online
    // state event.
    if (this.activeClients.get(onlineState.clientId)) {
      this.onlineStateHandler!(onlineState.onlineState);
    }
  }

  private extractActiveQueryTargets(
    clients: SortedMap<string, ClientState>
  ): SortedSet<TargetId> {
    let activeTargets = targetIdSet();
    clients.forEach((kev, value) => {
      activeTargets = activeTargets.unionWith(value.activeTargetIds);
    });
    return activeTargets;
  }
}

function fromWebStorageSequenceNumber(
  seqString: string | null
): ListenSequenceNumber {
  let sequenceNumber = ListenSequence.INVALID;
  if (seqString != null) {
    try {
      const parsed = JSON.parse(seqString);
      hardAssert(
        typeof parsed === 'number',
        'Found non-numeric sequence number'
      );
      sequenceNumber = parsed;
    } catch (e) {
      logError(LOG_TAG, 'Failed to read sequence number from WebStorage', e);
    }
  }
  return sequenceNumber;
}

/**
 * `MemorySharedClientState` is a simple implementation of SharedClientState for
 * clients using memory persistence. The state in this class remains fully
 * isolated and no synchronization is performed.
 */
export class MemorySharedClientState implements SharedClientState {
  private localState = new LocalClientState();
  private queryState: { [targetId: number]: QueryTargetState } = {};
  onlineStateHandler: ((onlineState: OnlineState) => void) | null = null;
  sequenceNumberHandler:
    | ((sequenceNumber: ListenSequenceNumber) => void)
    | null = null;

  addPendingMutation(batchId: BatchId): void {
    // No op.
  }

  updateMutationState(
    batchId: BatchId,
    state: 'acknowledged' | 'rejected',
    error?: FirestoreError
  ): void {
    // No op.
  }

  addLocalQueryTarget(targetId: TargetId): QueryTargetState {
    this.localState.addQueryTarget(targetId);
    return this.queryState[targetId] || 'not-current';
  }

  updateQueryState(
    targetId: TargetId,
    state: QueryTargetState,
    error?: FirestoreError
  ): void {
    this.queryState[targetId] = state;
  }

  removeLocalQueryTarget(targetId: TargetId): void {
    this.localState.removeQueryTarget(targetId);
  }

  isLocalQueryTarget(targetId: TargetId): boolean {
    return this.localState.activeTargetIds.has(targetId);
  }

  clearQueryState(targetId: TargetId): void {
    delete this.queryState[targetId];
  }

  getAllActiveQueryTargets(): TargetIdSet {
    return this.localState.activeTargetIds;
  }

  isActiveQueryTarget(targetId: TargetId): boolean {
    return this.localState.activeTargetIds.has(targetId);
  }

  start(): Promise<void> {
    this.localState = new LocalClientState();
    return Promise.resolve();
  }

  handleUserChange(
    user: User,
    removedBatchIds: BatchId[],
    addedBatchIds: BatchId[]
  ): void {
    // No op.
  }

  setOnlineState(onlineState: OnlineState): void {
    // No op.
  }

  shutdown(): void {}

  writeSequenceNumber(sequenceNumber: ListenSequenceNumber): void {}
}

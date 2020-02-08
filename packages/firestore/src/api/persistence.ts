/**
 * @license
 * Copyright 2020 Google Inc.
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

import * as firestore from '@firebase/firestore-types';

import { Code, FirestoreError } from '../util/error';
import * as objUtils from '../util/obj';
import {
  PersistenceFactory,
  newMemoryPersistence,
  FirestoreClient
} from '../core/firestore_client';
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { Deferred } from '../util/promise';
import { FirestoreSettings } from './database';
import { User } from '../auth/user';
import { LruGarbageCollector, LruParams } from '../local/lru_garbage_collector';
import { JsonProtoSerializer } from '../remote/serializer';
import {
  ClientId,
  MemorySharedClientState,
  SharedClientState,
  WebStorageSharedClientState
} from '../local/shared_client_state';
import { DatabaseInfo } from '../core/database_info';
import { Platform } from '../platform/platform';
import { Persistence } from '../local/persistence';
import { AsyncQueue } from '../util/async_queue';

// This module provides `enablePersistence()` and `clearPersistence()`
// methods that can be prototype-patched into the Firestore class. These
// methods are not meant to be used on their own as they depend on the
// `this` context of the enclosing Firestore class.

const DEFAULT_SYNCHRONIZE_TABS = false;

/** DOMException error code constants. */
const DOM_EXCEPTION_INVALID_STATE = 11;
const DOM_EXCEPTION_ABORTED = 20;
const DOM_EXCEPTION_QUOTA_EXCEEDED = 22;

/**
 * Helper type that makes some of Firestore's internal method accessible from
 * the methods that are patched into its prototype.
 */
export interface PrivateFirestore {
      _settings: FirestoreSettings;
      _firestoreClient: FirestoreClient | undefined;
      _queue: AsyncQueue;
      _configureClient(persistenceFactory: PersistenceFactory): Promise<void>;
      makeDatabaseInfo(): DatabaseInfo;
    };

/** Settings to use for IndexedDB persistence. */
export class IndexedDbPersistenceSettings {
  constructor(
    readonly cacheSizeBytes: number,
    readonly synchronizeTabs: boolean
  ) {}

  lruParams(): LruParams {
    return LruParams.withCacheSize(this.cacheSizeBytes);
  }
}

/**
 * Factory method that starts IndexedDB-based persistence.
 *
 * @returns A Promise that resolves with the various persistence components.
 */
async function newIndexedDbPersistence(
  settings: IndexedDbPersistenceSettings,
  user: User,
  asyncQueue: AsyncQueue,
  databaseInfo: DatabaseInfo,
  platform: Platform,
  clientId: ClientId
): Promise<{
  persistence: Persistence;
  garbageCollector: LruGarbageCollector | null;
  sharedClientState: SharedClientState;
}> {
  const persistenceKey = IndexedDbPersistence.buildStoragePrefix(databaseInfo);

  // Opt to use proto3 JSON in case the platform doesn't support Uint8Array.
  const serializer = new JsonProtoSerializer(databaseInfo.databaseId, {
    useProto3Json: true
  });

  if (!WebStorageSharedClientState.isAvailable(platform)) {
    throw new FirestoreError(
      Code.UNIMPLEMENTED,
      'IndexedDB persistence is only available on platforms that support LocalStorage.'
    );
  }

  const lruParams = settings.lruParams();

  const sharedClientState = settings.synchronizeTabs
    ? new WebStorageSharedClientState(
        asyncQueue,
        platform,
        persistenceKey,
        clientId,
        user
      )
    : new MemorySharedClientState();

  const persistence = await IndexedDbPersistence.createIndexedDbPersistence({
    allowTabSynchronization: settings.synchronizeTabs,
    persistenceKey,
    clientId,
    platform,
    queue: asyncQueue,
    serializer,
    lruParams,
    sequenceNumberSyncer: sharedClientState
  });

  return {
    persistence,
    garbageCollector: persistence.referenceDelegate.garbageCollector,
    sharedClientState
  };
}

/**
 * Decides whether the provided error allows us to gracefully disable
 * persistence (as opposed to crashing the client).
 */
function canFallback(error: FirestoreError | DOMException): boolean {
  if (error instanceof FirestoreError) {
    return (
      error.code === Code.FAILED_PRECONDITION ||
      error.code === Code.UNIMPLEMENTED
    );
  } else if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException
  ) {
    // There are a few known circumstances where we can open IndexedDb but
    // trying to read/write will fail (e.g. quota exceeded). For
    // well-understood cases, we attempt to detect these and then gracefully
    // fall back to memory persistence.
    // NOTE: Rather than continue to add to this list, we could decide to
    // always fall back, with the risk that we might accidentally hide errors
    // representing actual SDK bugs.
    return (
      // When the browser is out of quota we could get either quota exceeded
      // or an aborted error depending on whether the error happened during
      // schema migration.
      error.code === DOM_EXCEPTION_QUOTA_EXCEEDED ||
      error.code === DOM_EXCEPTION_ABORTED ||
      // Firefox Private Browsing mode disables IndexedDb and returns
      // INVALID_STATE for any usage.
      error.code === DOM_EXCEPTION_INVALID_STATE
    );
  }

  return true;
}

export function enablePersistence(
  this: PrivateFirestore,
  settings: firestore.PersistenceSettings = {}
): Promise<void> {
  if (this._firestoreClient) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'Firestore has already been started and persistence can no longer ' +
        'be enabled. You can only call enablePersistence() before calling ' +
        'any other methods on a Firestore object.'
    );
  }

  const synchronizeTabs = objUtils.defaulted(
    settings.synchronizeTabs,
    DEFAULT_SYNCHRONIZE_TABS
  );

  const indexedDbPersistenceSettings = new IndexedDbPersistenceSettings(
    this._settings.cacheSizeBytes,
    synchronizeTabs
  );

  const persistenceResult = new Deferred<void>();

  const persistenceWithFallback: PersistenceFactory = (
    user,
    asyncQueue,
    databaseInfo,
    platform,
    clientId
  ) => {
    try {
      const result = newIndexedDbPersistence(
        indexedDbPersistenceSettings,
        user,
        asyncQueue,
        databaseInfo,
        platform,
        clientId
      );
      persistenceResult.resolve();
      return result;
    } catch (error) {
      //  Regardless of whether or not the retry succeeds, from an user
      // perspective, offline persistence has failed.
      persistenceResult.reject(error);

      // An unknown failure on the first stage shuts everything down.
      if (!canFallback(error)) {
        throw error;
      }
      console.warn(
        'Error enabling offline persistence. Falling back to' +
          ' persistence disabled: ' +
          error
      );

      return newMemoryPersistence(
        user,
        asyncQueue,
        databaseInfo,
        platform,
        clientId
      );
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  this._configureClient(persistenceWithFallback);
  return persistenceResult.promise;
}

export function clearPersistence(this: PrivateFirestore): Promise<void> {
  const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
    this.makeDatabaseInfo()
  );
  const deferred = new Deferred<void>();
  this._queue.enqueueAndForgetEvenAfterShutdown(async () => {
    if (
      this._firestoreClient !== undefined &&
      !this._firestoreClient.clientTerminated
    ) {
      deferred.reject(
        new FirestoreError(
          Code.FAILED_PRECONDITION,
          'Persistence cannot be cleared after this Firestore instance is initialized.'
        )
      );
    } else {
      await IndexedDbPersistence.clearPersistence(persistenceKey);
      deferred.resolve();
    }
  });
  return deferred.promise;
}

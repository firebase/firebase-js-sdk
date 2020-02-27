/**
 * @license
 * Copyright 2020 Google LLC
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
  IndexedDbPersistence,
  IndexedDbPersistenceSettings,
  newIndexedDbPersistence
} from '../local/indexeddb_persistence';
import { Deferred } from '../util/promise';
import { Firestore } from './database';
import * as log from '../util/log';
import { makeConstructorPrivate } from '../util/api';
import { PersistenceFactory } from '../local/persistence';
import { newMemoryPersistence } from '../local/memory_persistence';

// This module provides a subclasses of the memory-only Firestore class that
// provides IndexedDb support via `enablePersistence()` and
// `clearPersistence()`.

const DEFAULT_SYNCHRONIZE_TABS = false;

/** DOMException error code constants. */
const DOM_EXCEPTION_INVALID_STATE = 11;
const DOM_EXCEPTION_ABORTED = 20;
const DOM_EXCEPTION_QUOTA_EXCEEDED = 22;

/**
 * A Firestore-implementation that provides support for `enablePersistence()`
 * and `clearPersistence()`.
 */
export class PersistenceFirestore extends Firestore {
  enablePersistence(settings?: firestore.PersistenceSettings): Promise<void> {
    if (this._firestoreClient) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and persistence can no longer ' +
          'be enabled. You can only call enablePersistence() before calling ' +
          'any other methods on a Firestore object.'
      );
    }

    let synchronizeTabs = false;

    if (settings) {
      if (settings.experimentalTabSynchronization !== undefined) {
        log.error(
          "The 'experimentalTabSynchronization' setting has been renamed to " +
            "'synchronizeTabs'. In a future release, the setting will be removed " +
            'and it is recommended that you update your ' +
            "firestore.enablePersistence() call to use 'synchronizeTabs'."
        );
      }
      synchronizeTabs = objUtils.defaulted(
        settings.synchronizeTabs !== undefined
          ? settings.synchronizeTabs
          : settings.experimentalTabSynchronization,
        DEFAULT_SYNCHRONIZE_TABS
      );
    }

    const persistenceResult = new Deferred<void>();

    const persistenceWithFallback: PersistenceFactory<IndexedDbPersistenceSettings> = async (
      user,
      asyncQueue,
      databaseInfo,
      platform,
      clientId,
      settings
    ) => {
      try {
        const result = await newIndexedDbPersistence(
          user,
          asyncQueue,
          databaseInfo,
          platform,
          clientId,
          settings
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
          'Error enabling offline persistence. Falling back to persistence disabled: ' +
            error
        );

        return newMemoryPersistence(
          user,
          asyncQueue,
          databaseInfo,
          platform,
          clientId,
          /* settings= */ {}
        );
      }
    };

    const indexedDbPersistenceSettings = new IndexedDbPersistenceSettings(
      this._settings.cacheSizeBytes,
      synchronizeTabs
    );

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._configureClient(
      persistenceWithFallback,
      indexedDbPersistenceSettings
    );
    return persistenceResult.promise;
  }

  clearPersistence(): Promise<void> {
    const persistenceKey = IndexedDbPersistence.buildStoragePrefix(
      this.makeDatabaseInfo()
    );
    const deferred = new Deferred<void>();
    this._queue.enqueueAndForgetEvenAfterShutdown(async () => {
      try {
        if (
          this._firestoreClient !== undefined &&
          !this._firestoreClient.clientTerminated
        ) {
          throw new FirestoreError(
            Code.FAILED_PRECONDITION,
            'Persistence cannot be cleared after this Firestore instance is initialized.'
          );
        }
        await IndexedDbPersistence.clearPersistence(persistenceKey);
        deferred.resolve();
      } catch (e) {
        deferred.reject(e);
      }
    });
    return deferred.promise;
  }
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

export const PublicPersistenceFirestore = makeConstructorPrivate(
  PersistenceFirestore,
  'Use firebase.firestore() instead.'
);

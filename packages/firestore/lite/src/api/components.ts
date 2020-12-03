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

import { Datastore, newDatastore } from '../../../src/remote/datastore';
import { newConnection } from '../../../src/platform/connection';
import { newSerializer } from '../../../src/platform/serializer';
import { logDebug } from '../../../src/util/log';
import { Code, FirestoreError } from '../../../src/util/error';
import { _FirebaseService } from '@firebase/app-types-exp';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import {
  LRU_COLLECTION_DISABLED,
  LRU_DEFAULT_CACHE_SIZE_BYTES
} from '../../../src/local/lru_garbage_collector';
import { LRU_MINIMUM_CACHE_SIZE_BYTES } from '../../../src/local/lru_garbage_collector_impl';
import { validateIsNotUsedTogether } from '../../../src/util/input_validation';
import {
  CredentialsProvider,
  CredentialsSettings
} from '../../../src/api/credentials';

export const LOG_TAG = 'ComponentProvider';

// settings() defaults:
export const DEFAULT_HOST = 'firestore.googleapis.com';
export const DEFAULT_SSL = true;

/** Undocumented, private additional settings not exposed in our public API. */
export interface PrivateSettings extends Settings {
  // Can be a google-auth-library or gapi client.
  credentials?: CredentialsSettings;
}

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
export class FirestoreSettings {
  /** The hostname to connect to. */
  readonly host: string;

  /** Whether to use SSL when connecting. */
  readonly ssl: boolean;

  readonly cacheSizeBytes: number;

  readonly experimentalForceLongPolling: boolean;

  readonly experimentalAutoDetectLongPolling: boolean;

  readonly ignoreUndefinedProperties: boolean;

  // Can be a google-auth-library or gapi client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials?: any;

  constructor(settings: PrivateSettings) {
    if (settings.host === undefined) {
      if (settings.ssl !== undefined) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          "Can't provide ssl option if host option is not set"
        );
      }
      this.host = DEFAULT_HOST;
      this.ssl = DEFAULT_SSL;
    } else {
      this.host = settings.host;
      this.ssl = settings.ssl ?? DEFAULT_SSL;
    }

    this.credentials = settings.credentials;
    this.ignoreUndefinedProperties = !!settings.ignoreUndefinedProperties;

    if (settings.cacheSizeBytes === undefined) {
      this.cacheSizeBytes = LRU_DEFAULT_CACHE_SIZE_BYTES;
    } else {
      if (
        settings.cacheSizeBytes !== LRU_COLLECTION_DISABLED &&
        settings.cacheSizeBytes < LRU_MINIMUM_CACHE_SIZE_BYTES
      ) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `cacheSizeBytes must be at least ${LRU_MINIMUM_CACHE_SIZE_BYTES}`
        );
      } else {
        this.cacheSizeBytes = settings.cacheSizeBytes;
      }
    }

    this.experimentalForceLongPolling = !!settings.experimentalForceLongPolling;
    this.experimentalAutoDetectLongPolling = !!settings.experimentalAutoDetectLongPolling;

    validateIsNotUsedTogether(
      'experimentalForceLongPolling',
      settings.experimentalForceLongPolling,
      'experimentalAutoDetectLongPolling',
      settings.experimentalAutoDetectLongPolling
    );
  }

  isEqual(other: FirestoreSettings): boolean {
    return (
      this.host === other.host &&
      this.ssl === other.ssl &&
      this.credentials === other.credentials &&
      this.cacheSizeBytes === other.cacheSizeBytes &&
      this.experimentalForceLongPolling ===
        other.experimentalForceLongPolling &&
      this.experimentalAutoDetectLongPolling ===
        other.experimentalAutoDetectLongPolling &&
      this.ignoreUndefinedProperties === other.ignoreUndefinedProperties
    );
  }
}

// The components module manages the lifetime of dependencies of the Firestore
// client. Dependencies can be lazily constructed and only one exists per
// Firestore instance.

export interface FirestoreService extends _FirebaseService {
  _credentials: CredentialsProvider;
  _persistenceKey: string;
  _databaseId: DatabaseId;
  _terminated: boolean;

  _freezeSettings(): FirestoreSettings;
}
/**
 * An instance map that ensures only one Datastore exists per Firestore
 * instance.
 */
const datastoreInstances = new Map<FirestoreService, Datastore>();

/**
 * Returns an initialized and started Datastore for the given Firestore
 * instance. Callers must invoke removeComponents() when the Firestore
 * instance is terminated.
 */
export function getDatastore(firestore: FirestoreService): Datastore {
  if (firestore._terminated) {
    throw new FirestoreError(
      Code.FAILED_PRECONDITION,
      'The client has already been terminated.'
    );
  }
  if (!datastoreInstances.has(firestore)) {
    logDebug(LOG_TAG, 'Initializing Datastore');
    const databaseInfo = makeDatabaseInfo(
      firestore._databaseId,
      firestore._persistenceKey,
      firestore._freezeSettings()
    );
    const connection = newConnection(databaseInfo);
    const serializer = newSerializer(firestore._databaseId);
    const datastore = newDatastore(
      firestore._credentials,
      connection,
      serializer
    );

    datastoreInstances.set(firestore, datastore);
  }
  return datastoreInstances.get(firestore)!;
}

/**
 * Removes all components associated with the provided instance. Must be called
 * when the `Firestore` instance is terminated.
 */
export function removeComponents(firestore: FirestoreService): void {
  const datastore = datastoreInstances.get(firestore);
  if (datastore) {
    logDebug(LOG_TAG, 'Removing Datastore');
    datastoreInstances.delete(firestore);
    datastore.terminate();
  }
}

export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
  experimentalAutoDetectLongPolling?: boolean;
}

export function makeDatabaseInfo(
  databaseId: DatabaseId,
  persistenceKey: string,
  settings: FirestoreSettings
): DatabaseInfo {
  return new DatabaseInfo(
    databaseId,
    persistenceKey,
    settings.host,
    settings.ssl,
    settings.experimentalForceLongPolling,
    settings.experimentalAutoDetectLongPolling
  );
}

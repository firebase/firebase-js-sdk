/**
 * @license
 * Copyright 2019 Google LLC
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

import { FetchStatus } from '@firebase/remote-config-types';
import {
  FetchResponse,
  FirebaseRemoteConfigObject
} from '../client/remote_config_fetch_client';
import { ERROR_FACTORY, ErrorCode } from '../errors';
import { FirebaseError } from '@firebase/util';

/**
 * Converts an error event associated with a {@link IDBRequest} to a {@link FirebaseError}.
 */
function toFirebaseError(event: Event, errorCode: ErrorCode): FirebaseError {
  const originalError = (event.target as IDBRequest).error || undefined;
  return ERROR_FACTORY.create(errorCode, {
    originalErrorMessage: originalError && originalError.message
  });
}

/**
 * A general-purpose store keyed by app + namespace + {@link
 * ProjectNamespaceKeyFieldValue}.
 *
 * <p>The Remote Config SDK can be used with multiple app installations, and each app can interact
 * with multiple namespaces, so this store uses app (ID + name) and namespace as common parent keys
 * for a set of key-value pairs. See {@link Storage#createCompositeKey}.
 *
 * <p>Visible for testing.
 */
export const APP_NAMESPACE_STORE = 'app_namespace_store';

const DB_NAME = 'firebase_remote_config';
const DB_VERSION = 1;

/**
 * Encapsulates metadata concerning throttled fetch requests.
 */
export interface ThrottleMetadata {
  // The number of times fetch has backed off. Used for resuming backoff after a timeout.
  backoffCount: number;
  // The Unix timestamp in milliseconds when callers can retry a request.
  throttleEndTimeMillis: number;
}

/**
 * Provides type-safety for the "key" field used by {@link APP_NAMESPACE_STORE}.
 *
 * <p>This seems like a small price to avoid potentially subtle bugs caused by a typo.
 */
type ProjectNamespaceKeyFieldValue =
  | 'active_config'
  | 'active_config_etag'
  | 'last_fetch_status'
  | 'last_successful_fetch_timestamp_millis'
  | 'last_successful_fetch_response'
  | 'settings'
  | 'throttle_metadata';

// Visible for testing.
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = event => {
      reject(toFirebaseError(event, ErrorCode.STORAGE_OPEN));
    };
    request.onsuccess = event => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // We don't use 'break' in this switch statement, the fall-through
      // behavior is what we want, because if there are multiple versions between
      // the old version and the current version, we want ALL the migrations
      // that correspond to those versions to run, not only the last one.
      // eslint-disable-next-line default-case
      switch (event.oldVersion) {
        case 0:
          db.createObjectStore(APP_NAMESPACE_STORE, {
            keyPath: 'compositeKey'
          });
      }
    };
  });
}

/**
 * Abstracts data persistence.
 */
export class Storage {
  /**
   * @param appId enables storage segmentation by app (ID + name).
   * @param appName enables storage segmentation by app (ID + name).
   * @param namespace enables storage segmentation by namespace.
   */
  constructor(
    private readonly appId: string,
    private readonly appName: string,
    private readonly namespace: string,
    private readonly openDbPromise = openDatabase()
  ) {}

  getLastFetchStatus(): Promise<FetchStatus | undefined> {
    return this.get<FetchStatus>('last_fetch_status');
  }

  setLastFetchStatus(status: FetchStatus): Promise<void> {
    return this.set<FetchStatus>('last_fetch_status', status);
  }

  // This is comparable to a cache entry timestamp. If we need to expire other data, we could
  // consider adding timestamp to all storage records and an optional max age arg to getters.
  getLastSuccessfulFetchTimestampMillis(): Promise<number | undefined> {
    return this.get<number>('last_successful_fetch_timestamp_millis');
  }

  setLastSuccessfulFetchTimestampMillis(timestamp: number): Promise<void> {
    return this.set<number>(
      'last_successful_fetch_timestamp_millis',
      timestamp
    );
  }

  getLastSuccessfulFetchResponse(): Promise<FetchResponse | undefined> {
    return this.get<FetchResponse>('last_successful_fetch_response');
  }

  setLastSuccessfulFetchResponse(response: FetchResponse): Promise<void> {
    return this.set<FetchResponse>('last_successful_fetch_response', response);
  }

  getActiveConfig(): Promise<FirebaseRemoteConfigObject | undefined> {
    return this.get<FirebaseRemoteConfigObject>('active_config');
  }

  setActiveConfig(config: FirebaseRemoteConfigObject): Promise<void> {
    return this.set<FirebaseRemoteConfigObject>('active_config', config);
  }

  getActiveConfigEtag(): Promise<string | undefined> {
    return this.get<string>('active_config_etag');
  }

  setActiveConfigEtag(etag: string): Promise<void> {
    return this.set<string>('active_config_etag', etag);
  }

  getThrottleMetadata(): Promise<ThrottleMetadata | undefined> {
    return this.get<ThrottleMetadata>('throttle_metadata');
  }

  setThrottleMetadata(metadata: ThrottleMetadata): Promise<void> {
    return this.set<ThrottleMetadata>('throttle_metadata', metadata);
  }

  deleteThrottleMetadata(): Promise<void> {
    return this.delete('throttle_metadata');
  }

  async get<T>(key: ProjectNamespaceKeyFieldValue): Promise<T | undefined> {
    const db = await this.openDbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([APP_NAMESPACE_STORE], 'readonly');
      const objectStore = transaction.objectStore(APP_NAMESPACE_STORE);
      const compositeKey = this.createCompositeKey(key);
      try {
        const request = objectStore.get(compositeKey);
        request.onerror = event => {
          reject(toFirebaseError(event, ErrorCode.STORAGE_GET));
        };
        request.onsuccess = event => {
          const result = (event.target as IDBRequest).result;
          if (result) {
            resolve(result.value);
          } else {
            resolve(undefined);
          }
        };
      } catch (e) {
        reject(
          ERROR_FACTORY.create(ErrorCode.STORAGE_GET, {
            originalErrorMessage: e && e.message
          })
        );
      }
    });
  }

  async set<T>(key: ProjectNamespaceKeyFieldValue, value: T): Promise<void> {
    const db = await this.openDbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([APP_NAMESPACE_STORE], 'readwrite');
      const objectStore = transaction.objectStore(APP_NAMESPACE_STORE);
      const compositeKey = this.createCompositeKey(key);
      try {
        const request = objectStore.put({
          compositeKey,
          value
        });
        request.onerror = (event: Event) => {
          reject(toFirebaseError(event, ErrorCode.STORAGE_SET));
        };
        request.onsuccess = () => {
          resolve();
        };
      } catch (e) {
        reject(
          ERROR_FACTORY.create(ErrorCode.STORAGE_SET, {
            originalErrorMessage: e && e.message
          })
        );
      }
    });
  }

  async delete(key: ProjectNamespaceKeyFieldValue): Promise<void> {
    const db = await this.openDbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([APP_NAMESPACE_STORE], 'readwrite');
      const objectStore = transaction.objectStore(APP_NAMESPACE_STORE);
      const compositeKey = this.createCompositeKey(key);
      try {
        const request = objectStore.delete(compositeKey);
        request.onerror = (event: Event) => {
          reject(toFirebaseError(event, ErrorCode.STORAGE_DELETE));
        };
        request.onsuccess = () => {
          resolve();
        };
      } catch (e) {
        reject(
          ERROR_FACTORY.create(ErrorCode.STORAGE_DELETE, {
            originalErrorMessage: e && e.message
          })
        );
      }
    });
  }

  // Facilitates composite key functionality (which is unsupported in IE).
  createCompositeKey(key: ProjectNamespaceKeyFieldValue): string {
    return [this.appId, this.appName, this.namespace, key].join();
  }
}

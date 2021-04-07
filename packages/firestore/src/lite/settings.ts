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

import { CredentialsSettings } from '../api/credentials';
import {
  LRU_COLLECTION_DISABLED,
  LRU_DEFAULT_CACHE_SIZE_BYTES
} from '../local/lru_garbage_collector';
import { LRU_MINIMUM_CACHE_SIZE_BYTES } from '../local/lru_garbage_collector_impl';
import { Code, FirestoreError } from '../util/error';
import { validateIsNotUsedTogether } from '../util/input_validation';

// settings() defaults:
export const DEFAULT_HOST = 'firestore.googleapis.com';
export const DEFAULT_SSL = true;

/**
 * Specifies custom configurations for your Cloud Firestore instance.
 * You must set these before invoking any other methods.
 */
export interface Settings {
  /** The hostname to connect to. */
  host?: string;

  /** Whether to use SSL when connecting. */
  ssl?: boolean;

  /**
   * Whether to skip nested properties that are set to `undefined` during
   * object serialization. If set to `true`, these properties are skipped
   * and not written to Firestore. If set to `false` or omitted, the SDK
   * throws an exception when it encounters properties of type `undefined`.
   */
  ignoreUndefinedProperties?: boolean;

  /**
   * An approximate cache size threshold for the on-disk data. If the cache
   * grows beyond this size, Firestore will start removing data that hasn't been
   * recently used. The size is not a guarantee that the cache will stay below
   * that size, only that if the cache exceeds the given size, cleanup will be
   * attempted.
   *
   * The default value is 40 MB. The threshold must be set to at least 1 MB, and
   * can be set to CACHE_SIZE_UNLIMITED to disable garbage collection.
   */
  cacheSizeBytes?: number;

  /**
   * Forces the SDK’s underlying network transport (WebChannel) to use
   * long-polling. Each response from the backend will be closed immediately
   * after the backend sends data (by default responses are kept open in
   * case the backend has more data to send). This avoids incompatibility
   * issues with certain proxies, antivirus software, etc. that incorrectly
   * buffer traffic indefinitely. Use of this option will cause some
   * performance degradation though.
   *
   * This setting cannot be used with `experimentalAutoDetectLongPolling` and
   * may be removed in a future release. If you find yourself using it to
   * work around a specific network reliability issue, please tell us about
   * it in https://github.com/firebase/firebase-js-sdk/issues/1674.
   */
  experimentalForceLongPolling?: boolean;

  /**
   * Configures the SDK's underlying transport (WebChannel) to automatically
   * detect if long-polling should be used. This is very similar to
   * `experimentalForceLongPolling`, but only uses long-polling if required.
   *
   * This setting will likely be enabled by default in future releases and
   * cannot be combined with `experimentalForceLongPolling`.
   */
  experimentalAutoDetectLongPolling?: boolean;
}

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

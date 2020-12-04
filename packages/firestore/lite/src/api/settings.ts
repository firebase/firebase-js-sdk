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

import { CredentialsSettings } from '../../../src/api/credentials';
import { Code, FirestoreError } from '../../../src/util/error';
import {
  LRU_COLLECTION_DISABLED,
  LRU_DEFAULT_CACHE_SIZE_BYTES
} from '../../../src/local/lru_garbage_collector';
import { LRU_MINIMUM_CACHE_SIZE_BYTES } from '../../../src/local/lru_garbage_collector_impl';
import { validateIsNotUsedTogether } from '../../../src/util/input_validation';

// settings() defaults:
export const DEFAULT_HOST = 'firestore.googleapis.com';
export const DEFAULT_SSL = true;

export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
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

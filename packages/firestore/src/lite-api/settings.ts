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

import { FirestoreLocalCache } from '../api/cache_config';
import { CredentialsSettings } from '../api/credentials';
import {
  ExperimentalLongPollingOptions,
  cloneLongPollingOptions,
  longPollingOptionsEqual
} from '../api/long_polling_options';
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

// The minimum long-polling timeout is hardcoded on the server. The value here
// should be kept in sync with the value used by the server, as the server will
// silently ignore a value below the minimum and fall back to the default.
// Googlers see b/266868871 for relevant discussion.
const MIN_LONG_POLLING_TIMEOUT_SECONDS = 5;

// No maximum long-polling timeout is configured in the server, and defaults to
// 30 seconds, which is what Watch appears to use.
// Googlers see b/266868871 for relevant discussion.
const MAX_LONG_POLLING_TIMEOUT_SECONDS = 30;

// Whether long-polling auto-detected is enabled by default.
const DEFAULT_AUTO_DETECT_LONG_POLLING = true;

/**
 * Specifies custom configurations for your Cloud Firestore instance.
 * You must set these before invoking any other methods.
 */
export interface FirestoreSettings {
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
}

/**
 * @internal
 * Undocumented, private additional settings not exposed in our public API.
 */
export interface PrivateSettings extends FirestoreSettings {
  // Can be a google-auth-library or gapi client.
  credentials?: CredentialsSettings;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
  experimentalAutoDetectLongPolling?: boolean;
  experimentalLongPollingOptions?: ExperimentalLongPollingOptions;
  useFetchStreams?: boolean;

  localCache?: FirestoreLocalCache;
}

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied `FirestoreSettings` object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
export class FirestoreSettingsImpl {
  /** The hostname to connect to. */
  readonly host: string;

  /** Whether to use SSL when connecting. */
  readonly ssl: boolean;

  readonly cacheSizeBytes: number;

  readonly experimentalForceLongPolling: boolean;

  readonly experimentalAutoDetectLongPolling: boolean;

  readonly experimentalLongPollingOptions: ExperimentalLongPollingOptions;

  readonly ignoreUndefinedProperties: boolean;

  readonly useFetchStreams: boolean;
  readonly localCache?: FirestoreLocalCache;

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
    this.localCache = settings.localCache;

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

    validateIsNotUsedTogether(
      'experimentalForceLongPolling',
      settings.experimentalForceLongPolling,
      'experimentalAutoDetectLongPolling',
      settings.experimentalAutoDetectLongPolling
    );

    this.experimentalForceLongPolling = !!settings.experimentalForceLongPolling;

    if (this.experimentalForceLongPolling) {
      this.experimentalAutoDetectLongPolling = false;
    } else if (settings.experimentalAutoDetectLongPolling === undefined) {
      this.experimentalAutoDetectLongPolling = DEFAULT_AUTO_DETECT_LONG_POLLING;
    } else {
      // For backwards compatibility, coerce the value to boolean even though
      // the TypeScript compiler has narrowed the type to boolean already.
      // noinspection PointlessBooleanExpressionJS
      this.experimentalAutoDetectLongPolling =
        !!settings.experimentalAutoDetectLongPolling;
    }

    this.experimentalLongPollingOptions = cloneLongPollingOptions(
      settings.experimentalLongPollingOptions ?? {}
    );
    validateLongPollingOptions(this.experimentalLongPollingOptions);

    this.useFetchStreams = !!settings.useFetchStreams;
  }

  isEqual(other: FirestoreSettingsImpl): boolean {
    return (
      this.host === other.host &&
      this.ssl === other.ssl &&
      this.credentials === other.credentials &&
      this.cacheSizeBytes === other.cacheSizeBytes &&
      this.experimentalForceLongPolling ===
        other.experimentalForceLongPolling &&
      this.experimentalAutoDetectLongPolling ===
        other.experimentalAutoDetectLongPolling &&
      longPollingOptionsEqual(
        this.experimentalLongPollingOptions,
        other.experimentalLongPollingOptions
      ) &&
      this.ignoreUndefinedProperties === other.ignoreUndefinedProperties &&
      this.useFetchStreams === other.useFetchStreams
    );
  }
}

function validateLongPollingOptions(
  options: ExperimentalLongPollingOptions
): void {
  if (options.timeoutSeconds !== undefined) {
    if (isNaN(options.timeoutSeconds)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `invalid long polling timeout: ` +
          `${options.timeoutSeconds} (must not be NaN)`
      );
    }
    if (options.timeoutSeconds < MIN_LONG_POLLING_TIMEOUT_SECONDS) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `invalid long polling timeout: ${options.timeoutSeconds} ` +
          `(minimum allowed value is ${MIN_LONG_POLLING_TIMEOUT_SECONDS})`
      );
    }
    if (options.timeoutSeconds > MAX_LONG_POLLING_TIMEOUT_SECONDS) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `invalid long polling timeout: ${options.timeoutSeconds} ` +
          `(maximum allowed value is ${MAX_LONG_POLLING_TIMEOUT_SECONDS})`
      );
    }
  }
}

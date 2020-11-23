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

import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { Code, FirestoreError } from '../../../src/util/error';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider,
  CredentialsSettings,
  EmptyCredentialsProvider,
  makeCredentialsProvider
} from '../../../src/api/credentials';
import { removeComponents } from './components';
import {
  LRU_COLLECTION_DISABLED,
  LRU_DEFAULT_CACHE_SIZE_BYTES,
  LRU_MINIMUM_CACHE_SIZE_BYTES
} from '../../../src/local/lru_garbage_collector';
import {
  cast,
  validateIsNotUsedTogether
} from '../../../src/util/input_validation';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore/lite': FirebaseFirestore;
  }
}

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;

export interface Settings {
  host?: string;
  ssl?: boolean;
  ignoreUndefinedProperties?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
  experimentalAutoDetectLongPolling?: boolean;
}

/** Undocumented, private additional settings not exposed in our public API. */
interface PrivateSettings extends Settings {
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

/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link getFirestore}.
 */
export class FirebaseFirestore implements _FirebaseService {
  readonly _databaseId: DatabaseId;
  readonly _persistenceKey: string = '(lite)';
  _credentials: CredentialsProvider;

  private _settings = new FirestoreSettings({});
  private _settingsFrozen = false;

  // A task that is assigned when the terminate() is invoked and resolved when
  // all components have shut down.
  private _terminateTask?: Promise<void>;

  private _app?: FirebaseApp;

  /** @hideconstructor */
  constructor(
    databaseIdOrApp: DatabaseId | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    if (databaseIdOrApp instanceof DatabaseId) {
      this._databaseId = databaseIdOrApp;
      this._credentials = new EmptyCredentialsProvider();
    } else {
      this._app = databaseIdOrApp as FirebaseApp;
      this._databaseId = databaseIdFromApp(databaseIdOrApp as FirebaseApp);
      this._credentials = new FirebaseCredentialsProvider(authProvider);
    }
  }

  /**
   * The {@link FirebaseApp} associated with this `Firestore` service
   * instance.
   */
  get app(): FirebaseApp {
    if (!this._app) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        "Firestore was not initialized using the Firebase SDK. 'app' is " +
          'not available'
      );
    }
    return this._app;
  }

  get _initialized(): boolean {
    return this._settingsFrozen;
  }

  get _terminated(): boolean {
    return this._terminateTask !== undefined;
  }

  _setSettings(settings: PrivateSettings): void {
    if (this._settingsFrozen) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. You can only modify settings before calling any other ' +
          'methods on a Firestore object.'
      );
    }
    this._settings = new FirestoreSettings(settings);
    if (settings.credentials !== undefined) {
      this._credentials = makeCredentialsProvider(settings.credentials);
    }
  }

  _getSettings(): FirestoreSettings {
    return this._settings;
  }

  _freezeSettings(): FirestoreSettings {
    this._settingsFrozen = true;
    return this._settings;
  }

  _delete(): Promise<void> {
    if (!this._terminateTask) {
      this._terminateTask = this._terminate();
    }
    return this._terminateTask;
  }

  /**
   * Terminates all components used by this client. Subclasses can override
   * this method to clean up their own dependencies, but must also call this
   * method.
   *
   * Only ever called once.
   */
  protected _terminate(): Promise<void> {
    removeComponents(this);
    return Promise.resolve();
  }
}

function databaseIdFromApp(app: FirebaseApp): DatabaseId {
  if (!Object.prototype.hasOwnProperty.apply(app.options, ['projectId'])) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      '"projectId" not provided in firebase.initializeApp.'
    );
  }

  return new DatabaseId(app.options.projectId!);
}

/**
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other functions, including
 * {@link getFirestore}. If the custom settings are empty, this function is
 * equivalent to calling {@link getFirestore}.
 *
 * @param app - The {@link FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param settings - A settings object to configure the `Firestore` instance.
 * @returns A newly initialized Firestore instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  settings: Settings
): FirebaseFirestore {
  const firestore = _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as FirebaseFirestore;
  firestore._setSettings(settings);
  return firestore;
}

/**
 * Returns the existing instance of Firestore that is associated with the
 * provided {@link FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app - The {@link FirebaseApp} instance that the returned Firestore
 * instance is associated with.
 * @returns The `Firestore` instance of the provided app.
 */
export function getFirestore(app: FirebaseApp): FirebaseFirestore {
  return _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as FirebaseFirestore;
}

/**
 * Terminates the provided Firestore instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` functions
 * may be used. Any other function will throw a `FirestoreError`. Termination
 * does not cancel any pending writes, and any promises that are awaiting a
 * response from the server will not be resolved.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * {@link getFirestore}.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * function is useful only when you want to force this instance to release all of
 * its resources or in combination with {@link clearIndexedDbPersistence} to
 * ensure that all local state is destroyed between test runs.
 *
 * @returns A promise that is resolved when the instance has been successfully
 * terminated.
 */
export function terminate(firestore: FirebaseFirestore): Promise<void> {
  firestore = cast(firestore, FirebaseFirestore);
  _removeServiceInstance(firestore.app, 'firestore/lite');
  return firestore._delete();
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

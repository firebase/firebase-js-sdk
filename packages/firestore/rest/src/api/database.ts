/**
 * @license
 * Copyright 2017 Google LLC
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


import * as api from '../protos/firestore_proto_api';

import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp, FirebaseService } from '@firebase/app-types/private';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { LruParams } from '../../../src/local/lru_garbage_collector';
import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { PlatformSupport } from '../../../src/platform/platform';
import { debugAssert} from '../../../src/util/assert';
import { Code, FirestoreError } from '../../../src/util/error';
import {
  validateNamedOptionalType,
  validateNamedType,
  validateOptionNames,
} from '../../../src/util/input_validation';

import {
  CredentialsProvider,
  CredentialsSettings,
  EmptyCredentialsProvider,
  FirebaseCredentialsProvider,
} from '../../../src/api/credentials';
import { UserDataWriter } from '../../../src/api/user_data_writer';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import {Datastore} from "../../../src/remote/datastore";

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;
/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
export const CACHE_SIZE_UNLIMITED = LruParams.COLLECTION_DISABLED;

// enablePersistence() defaults:
const DEFAULT_SYNCHRONIZE_TABS = false;

/** Undocumented, private additional settings not exposed in our public API. */
interface PrivateSettings extends firestore.Settings {
  // Can be a google-auth-library or gapi client.
  credentials?: CredentialsSettings;
}

/**
 * Options that can be provided in the Firestore constructor when not using
 * Firebase (aka standalone mode).
 */
export interface FirestoreDatabase {
  projectId: string;
  database?: string;
}

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
class FirestoreSettings {
  /** The hostname to connect to. */
  readonly host: string;

  /** Whether to use SSL when connecting. */
  readonly ssl: boolean;

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
      validateNamedType('settings', 'non-empty string', 'host', settings.host);
      this.host = settings.host;

      validateNamedOptionalType('settings', 'boolean', 'ssl', settings.ssl);
      this.ssl = settings.ssl ?? DEFAULT_SSL;
    }
    validateOptionNames('settings', settings, ['host', 'ssl', 'credentials']);

    validateNamedOptionalType(
      'settings',
      'object',
      'credentials',
      settings.credentials
    );
    this.credentials = settings.credentials;
  }

  isEqual(other: FirestoreSettings): boolean {
    return (
      this.host === other.host &&
      this.ssl === other.ssl &&
      this.credentials === other.credentials
    );
  }
}

/**
 * The root reference to the database.
 */
export class Firestore {
  // The objects that are a part of this API are exposed to third-parties as
  // compiled javascript so we want to flag our private members with a leading
  // underscore to discourage their use.
  readonly _databaseId: DatabaseId;
  private _credentials: CredentialsProvider;
  private readonly _firebaseApp: FirebaseApp | null = null;
  private _settings: FirestoreSettings;

  // The firestore client instance. This will be available as soon as
  // configureClient is called, but any calls against it will block until
  // setup has completed.
  //
  // Operations on the _firestoreClient don't block on _firestoreReady. Those
  // are already set to synchronize on the async queue.
  private _datastore: Datastore | undefined;

  // Note: We are using `MemoryComponentProvider` as a default
  // ComponentProvider to ensure backwards compatibility with the format
  // expected by the console build.
  constructor(
    databaseIdOrApp: FirestoreDatabase | FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    if (typeof (databaseIdOrApp as FirebaseApp).options === 'object') {
      // This is very likely a Firebase app object
      // TODO(b/34177605): Can we somehow use instanceof?
      const app = databaseIdOrApp as FirebaseApp;
      this._firebaseApp = app;
      this._databaseId = Firestore.databaseIdFromApp(app);
      this._credentials = new FirebaseCredentialsProvider(authProvider);
    } else {
      const external = databaseIdOrApp as FirestoreDatabase;
      if (!external.projectId) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Must provide projectId'
        );
      }

      this._databaseId = new DatabaseId(external.projectId, external.database);
      this._credentials = new EmptyCredentialsProvider();
    }

    this._settings = new FirestoreSettings({});
  }

  async ensureClientConfigured() : Promise<void> {
    if (!this._datastore) {
      const databaseInfo = this.makeDatabaseInfo();

      const conenction = await PlatformSupport.getPlatform().loadConnection(databaseInfo);
      const serializer = PlatformSupport.getPlatform().newSerializer(databaseInfo);
      this._datastore = new Datastore(conenction,
        this._credentials,serializer
      );

    }
    return this._datastore as Datastore;
  }

  private makeDatabaseInfo(): DatabaseInfo {
    return new DatabaseInfo(
      this._databaseId,
      /* persistenceKey= */ 'invalid',
      this._settings.host,
      this._settings.ssl,
        /* forceLongPolling= */ false
    );
  }

  private static databaseIdFromApp(app: FirebaseApp): DatabaseId {
    if (!Object.prototype.hasOwnProperty.apply(app.options,['projectId'])) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        '"projectId" not provided in firebase.initializeApp.'
      );
    }

    const projectId = app.options.projectId;
    if (!projectId || typeof projectId !== 'string') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'projectId must be a string in FirebaseApp.options'
      );
    }
    return new DatabaseId(projectId);
  }
}

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData> {
  private _firestoreClient: FirestoreClient;

  constructor(
    public _key: DocumentKey,
    readonly firestore: Firestore
  ) {
    this._firestoreClient = this.firestore.ensureClientConfigured();
  }
}

export class DocumentSnapshot<T = firestore.DocumentData> {
  constructor(
    private _firestore: Firestore,
    private _key: DocumentKey,
    public _document: Document | null
  ) {}

  data(): T | undefined {
    if (!this._document) {
      return undefined;
    } else {
        const userDataWriter = new UserDataWriter(
          this._firestore,
          /* timestampsInSnapshots= */ false,
          /* timestampsInSnapshots= */ 'default',
          /* converter= */ undefined
        );
        return userDataWriter.convertValue(this._document.toProto()) as T;
      }
    }
}

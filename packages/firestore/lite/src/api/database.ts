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

import * as firestore from '../../';

import { _getProvider } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';

import { Code, FirestoreError } from '../../../src/util/error';
import { DatabaseId } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  CredentialsProvider,
  FirebaseCredentialsProvider
} from '../../../src/api/credentials';

// TODO(firestorelite): Depend on FirebaseService once #3112 is merged

/**
 * The root reference to the Firestore Lite database.
 */
export class Firestore implements firestore.FirebaseFirestore {
  readonly _databaseId: DatabaseId;
  private readonly _firebaseApp: FirebaseApp;
  private readonly _credentials: CredentialsProvider;
  private _settings?: firestore.Settings;

  constructor(
    app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>
  ) {
    this._firebaseApp = app;
    this._databaseId = Firestore.databaseIdFromApp(app);
    this._credentials = new FirebaseCredentialsProvider(authProvider);
  }

  get app(): FirebaseApp {
    return this._firebaseApp;
  }

  _configureClient(settings: firestore.Settings): void {
    if (this._settings) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Firestore has already been started and its settings can no longer ' +
          'be changed. initializeFirestore() can only be called before calling ' +
          'getFirestore().'
      );
    }
    this._settings = settings;
  }

  _ensureClientConfigured(): void {
    if (!this._settings) {
      this._settings = {};
    }
  }

  private static databaseIdFromApp(app: FirebaseApp): DatabaseId {
    if (!Object.prototype.hasOwnProperty.apply(app.options, ['projectId'])) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        '"projectId" not provided in firebase.initializeApp.'
      );
    }

    return new DatabaseId(app.options.projectId!);
  }
}

export function initializeFirestore(
  app: FirebaseApp,
  settings: firestore.Settings
): Firestore {
  const firestore = _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as Firestore;
  firestore._configureClient(settings);
  return firestore;
}

export function getFirestore(app: FirebaseApp): Firestore {
  const firestore = _getProvider(
    app,
    'firestore/lite'
  ).getImmediate() as Firestore;
  firestore._ensureClientConfigured();
  return firestore;
}

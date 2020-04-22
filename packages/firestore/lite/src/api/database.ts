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

import * as firestore from '../../';

import { FirebaseApp } from '@firebase/app-types';
import { Code, FirestoreError } from '../../../src/util/error';
import { FirebaseService } from '@firebase/app-types/private';

// settings() defaults:
const DEFAULT_HOST = 'firestore.googleapis.com';
const DEFAULT_SSL = true;

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

  constructor(settings: firestore.Settings) {
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
  }

  isEqual(other: FirestoreSettings): boolean {
    return (
      this.host === other.host &&
      this.ssl === other.ssl
    );
  }
}

/**
 * The root reference to the database.
 */
export class Firestore implements firestore.FirebaseFirestore, FirebaseService {
  private readonly _firebaseApp: FirebaseApp;
  private _settings: FirestoreSettings;

  constructor(app: FirebaseApp) {
    this._firebaseApp = app;
    this._settings = new FirestoreSettings({});
  }

  get app(): FirebaseApp {
    return this._firebaseApp;
  }

  _configureClient(settings: Settings): void {
    this._settings = new FirestoreSettings(settings);
  }
}

export interface Settings {
  host?: string;
  ssl?: boolean;
}

export function initializeFirestore(firstore: Firestore, settings?: Settings) {
  firstore._configureClient(settings ?? {});
}


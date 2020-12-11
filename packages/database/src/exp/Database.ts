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

// eslint-disable-next-line import/no-extraneous-dependencies
import { _getProvider } from '@firebase/app-exp';
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { Reference } from '../api/Reference';
import { fatal } from '../core/util/util';
import { RepoManager } from '../core/RepoManager';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Database } from '../api/Database';
import { Provider } from '@firebase/component';

/**
 * Class representing a Firebase Realtime Database.
 */
export class FirebaseDatabase implements _FirebaseService {
  static readonly ServerValue = Database.ServerValue;

  private _internalDb?: Database;
  private _internalDbUrl?: string;

  constructor(
    readonly app: FirebaseApp,
    private _authProvider: Provider<FirebaseAuthInternalName>
  ) {}

  set _databaseUrl(url: string) {
    if (this._internalDb) {
      fatal(
        'Cannot change database URL after instance has already been initialized.'
      );
    }
    this._internalDbUrl = url;
  }

  get _delegate() {
    if (!this._internalDb) {
      this._internalDb = RepoManager.getInstance().databaseFromApp(
        this.app,
        this._authProvider,
        this._internalDbUrl
      );
    }
    return this._internalDb;
  }

  /**
   * Modify this instance to communicate with the Realtime Database emulator.
   *
   * <p>Note: This method must be called before performing any other operation.
   *
   * @param host - the emulator host (ex: localhost)
   * @param port - the emulator port (ex: 8080)
   */
  useEmulator(host: string, port: number): void {
    this._delegate.useEmulator(host, port);
  }

  /**
   * Returns a reference to the root or to the path specified in the provided
   * argument.
   *
   * @param path - The relative string path or an existing Reference to a
   * database location.
   * @throws If a Reference is provided, throws if it does not belong to the
   * same project.
   * @returns Firebase reference.
   */
  ref(path?: string): Reference;
  ref(path?: Reference): Reference;
  ref(path?: string | Reference): Reference {
    return typeof path === 'string'
      ? this._delegate.ref(path)
      : this._delegate.ref(path);
  }

  /**
   * Returns a reference to the root or the path specified in url.
   * We throw a exception if the url is not in the same domain as the
   * current repo.
   * @param url - A URL that refers to a database location.
   * @returns A Firebase reference.
   */
  refFromURL(url: string): Reference {
    return this._delegate.refFromURL(url);
  }

  goOffline(): void {
    this._delegate.goOffline();
  }

  goOnline(): void {
    this._delegate.goOnline();
  }

  _delete(): Promise<void> {
    return this._delegate.INTERNAL.delete();
  }

  _setDatabaseUrl(url: string) {}
}

const ServerValue = Database.ServerValue;
export { ServerValue };

/**
 * Initializes a new instance of the Realtime Database. If a custom database URL
 * is specified, the URL overrides the database URL provided by the Firebase
 * App.
 *
 * @param app - The {@link FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param url - A settings object to configure the `Firestore` instance.
 * @returns A newly initialized `Firestore` instance.
 */
export function initializeDatabase(
  app: FirebaseApp,
  url: string
): FirebaseDatabase {
  const firestore = _getProvider(
    app,
    'database-exp'
  ).getImmediate() as FirebaseDatabase;
  firestore._databaseUrl = url;
  return firestore;
}

/**
 * Returns the instance of the Realtime Database SDK that is associated
 * with the provided {@link FirebaseApp}. Initializes a new instance with
 * with default settings if no instance exists or if the existing instance uses
 * a custom database URL.
 *
 * @param app - The {@link FirebaseApp} instance that the returned Firestore
 * instance is associated with.
 * @returns The `Firestore` instance of the provided app.
 */
export function getDatabase(app: FirebaseApp): FirebaseDatabase {
  return _getProvider(app, 'database-exp').getImmediate() as FirebaseDatabase;
}

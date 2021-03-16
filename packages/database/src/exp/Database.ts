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
import { _FirebaseService, _getProvider, FirebaseApp } from '@firebase/app-exp';
import { Reference } from '../api/Reference';
import { repoManagerDatabaseFromApp } from '../core/RepoManager';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Database } from '../api/Database';
import { Provider } from '@firebase/component';

/**
 * Class representing a Firebase Realtime Database.
 */
export class FirebaseDatabase implements _FirebaseService {
  static readonly ServerValue = Database.ServerValue;

  private _delegate: Database;

  constructor(
    readonly app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>,
    databaseUrl?: string
  ) {
    this._delegate = repoManagerDatabaseFromApp(
      this.app,
      authProvider,
      databaseUrl,
      undefined
    );
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
 * Returns the instance of the Realtime Database SDK that is associated
 * with the provided {@link FirebaseApp}. Initializes a new instance with
 * with default settings if no instance exists or if the existing instance uses
 * a custom database URL.
 *
 * @param app - The {@link FirebaseApp} instance that the returned Realtime
 * Database instance is associated with.
 * @param url - The URL of the Realtime Database instance to connect to. If not
 * provided, the SDK connects to the default instance of the Firebase App.
 * @returns The `FirebaseDatabase` instance of the provided app.
 */
export function getDatabase(app: FirebaseApp, url?: string): FirebaseDatabase {
  return _getProvider(app, 'database-exp').getImmediate({
    identifier: url
  }) as FirebaseDatabase;
}

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
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

/**
 * Class representing a Firebase Realtime Database.
 */
export class FirebaseDatabase implements _FirebaseService {
  readonly 'type' = 'database';

  constructor(
    readonly app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>,
    databaseUrl?: string
  ) {}

  _delete(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }
}

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

export function useDatabaseEmulator(
  db: FirebaseDatabase,
  host: string,
  port: number
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function goOffline(db: FirebaseDatabase): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function goOnline(db: FirebaseDatabase): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function ref(
  db: FirebaseDatabase,
  path?: string | Reference
): Reference {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function refFromURL(db: FirebaseDatabase, url: string): Reference {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

export function enableLogging(
  logger?: boolean | ((message: string) => unknown),
  persistent?: boolean
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
}

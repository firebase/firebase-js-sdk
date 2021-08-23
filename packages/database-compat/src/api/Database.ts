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
// eslint-disable-next-line import/no-extraneous-dependencies

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import {
  goOnline,
  connectDatabaseEmulator,
  goOffline,
  ref,
  refFromURL,
  increment,
  serverTimestamp,
  Database as ModularDatabase
} from '@firebase/database';
import {
  validateArgCount,
  Compat,
  EmulatorMockTokenOptions
} from '@firebase/util';


import { Reference } from './Reference';

/**
 * Class representing a firebase database.
 */
export class Database implements FirebaseService, Compat<ModularDatabase> {
  static readonly ServerValue = {
    TIMESTAMP: serverTimestamp(),
    increment: (delta: number) => increment(delta)
  };

  /**
   * The constructor should not be called by users of our public API.
   */
  constructor(readonly _delegate: ModularDatabase, readonly app: FirebaseApp) {}

  INTERNAL = {
    delete: () => this._delegate._delete()
  };

  /**
   * Modify this instance to communicate with the Realtime Database emulator.
   *
   * <p>Note: This method must be called before performing any other operation.
   *
   * @param host - the emulator host (ex: localhost)
   * @param port - the emulator port (ex: 8080)
   * @param options.mockUserToken - the mock auth token to use for unit testing Security Rules
   */
  useEmulator(
    host: string,
    port: number,
    options: {
      mockUserToken?: EmulatorMockTokenOptions;
    } = {}
  ): void {
    connectDatabaseEmulator(this._delegate, host, port, options);
  }

  /**
   * Returns a reference to the root or to the path specified in the provided
   * argument.
   *
   * @param path - The relative string path or an existing Reference to a database
   * location.
   * @throws If a Reference is provided, throws if it does not belong to the
   * same project.
   * @returns Firebase reference.
   */
  ref(path?: string): Reference;
  ref(path?: Reference): Reference;
  ref(path?: string | Reference): Reference {
    validateArgCount('database.ref', 0, 1, arguments.length);
    if (path instanceof Reference) {
      const childRef = refFromURL(this._delegate, path.toString());
      return new Reference(this, childRef);
    } else {
      const childRef = ref(this._delegate, path);
      return new Reference(this, childRef);
    }
  }

  /**
   * Returns a reference to the root or the path specified in url.
   * We throw a exception if the url is not in the same domain as the
   * current repo.
   * @returns Firebase reference.
   */
  refFromURL(url: string): Reference {
    const apiName = 'database.refFromURL';
    validateArgCount(apiName, 1, 1, arguments.length);
    const childRef = refFromURL(this._delegate, url);
    return new Reference(this, childRef);
  }

  // Make individual repo go offline.
  goOffline(): void {
    validateArgCount('database.goOffline', 0, 0, arguments.length);
    return goOffline(this._delegate);
  }

  goOnline(): void {
    validateArgCount('database.goOnline', 0, 0, arguments.length);
    return goOnline(this._delegate);
  }
}

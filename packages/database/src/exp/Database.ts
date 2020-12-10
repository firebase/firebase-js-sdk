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
import { _getProvider, _removeServiceInstance } from '@firebase/app-exp';
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { Reference } from '../api/Reference';
import { Repo } from '../core/Repo';
import { fatal } from '../core/util/util';
import { RepoManager } from '../core/RepoManager';
import { Path } from '../core/util/Path';
import { parseRepoInfo } from '../core/util/libs/parser';
import { validateUrl } from '../core/util/validation';
import { Database } from '../api/Database';

/**
 * Class representing a firebase database.
 */
export class FirebaseDatabase implements _FirebaseService {
  static readonly ServerValue = Database.ServerValue;

  constructor(private _app: FirebaseApp, private _delegate: Database) {}

  get app(): FirebaseApp {
    return this._app;
  }

  /**
   * Modify this instance to communicate with the Realtime Database emulator.
   *
   * <p>Note: This method must be called before performing any other operation.
   *
   * @param host the emulator host (ex: localhost)
   * @param port the emulator port (ex: 8080)
   */
  useEmulator(host: string, port: number): void {
    this._delegate.useEmulator(host, port);
  }

  /**
   * Returns a reference to the root or to the path specified in the provided
   * argument.
   *
   * @param {string|Reference=} path The relative string path or an existing
   * Reference to a database location.
   * @throws If a Reference is provided, throws if it does not belong to the
   * same project.
   * @return {!Reference} Firebase reference.
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
   * @param {string} url
   * @return {!Reference} Firebase reference.
   */
  refFromURL(url: string): Reference {
    return this._delegate.refFromURL(url);
  }

  // Make individual repo go offline.
  goOffline(): void {
    this._delegate.goOffline();
  }

  goOnline(): void {
    this._delegate.goOnline();
  }

  _delete(): Promise<void> {
    return this._delegate.INTERNAL.delete();
  }
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
export function getFirestore(app: FirebaseApp): FirebaseDatabase {
  return _getProvider(app, 'firebase-exp').getImmediate() as FirebaseDatabase;
}

/**
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other function, including
 * {@link getFirestore}. If the custom settings are empty, this function is
 * equivalent to calling {@link getFirestore}.
 *
 * @param app - The {@link FirebaseApp} with which the `Firestore` instance will
 * be associated.
 * @param settings - A settings object to configure the `Firestore` instance.
 * @returns A newly initialized `Firestore` instance.
 */
export function initializeFirestore(
  app: FirebaseApp,
  databaseUrl: string
): FirebaseFirestore {
  const firestore = _getProvider(
    app,
    'firestore-exp'
  ).getImmediate() as FirebaseFirestore;

  if (
    settings.cacheSizeBytes !== undefined &&
    settings.cacheSizeBytes !== CACHE_SIZE_UNLIMITED &&
    settings.cacheSizeBytes < LRU_MINIMUM_CACHE_SIZE_BYTES
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `cacheSizeBytes must be at least ${LRU_MINIMUM_CACHE_SIZE_BYTES}`
    );
  }

  firestore._setSettings(settings);
  return firestore;
}

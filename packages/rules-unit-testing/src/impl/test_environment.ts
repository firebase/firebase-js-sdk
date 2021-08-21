/**
 * @license
 * Copyright 2021 Google LLC
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

import { createMockUserToken } from '@firebase/util';

// TODO: Change these imports to firebase/* once exp packages are moved into their places.
import {
  connectDatabaseEmulator,
  Database,
  set,
  ref
} from '@firebase/database/dist/exp';
import {
  FirestoreSettings,
  Firestore,
  connectFirestoreEmulator
} from '@firebase/firestore/dist/exp';
import { connectStorageEmulator, FirebaseStorage } from '@firebase/storage/exp';

import { FirebaseApp } from '@firebase/app-types';
import {
  HostAndPort,
  RulesTestContext,
  RulesTestEnvironment,
  TokenOptions
} from '../public_types';
import firebase from '@firebase/app-compat';
import '@firebase/firestore/dist/compat/esm2017/firestore/index';
import '@firebase/database/dist/compat/esm2017/index';
import '@firebase/storage/dist/compat/esm2017/index';

import { DiscoveredEmulators } from './discovery';

/**
 * An implementation of {@code RulesTestEnvironment}. This is private to hide the constructor,
 * which should never be directly called by the developer.
 * @private
 */
export class RulesTestEnvironmentImpl implements RulesTestEnvironment {
  private contexts = new Set<RulesTestContextImpl>();
  private destroyed = false;

  constructor(
    readonly projectId: string,
    readonly emulators: DiscoveredEmulators
  ) {}

  authenticatedContext(
    user_id: string,
    tokenOptions?: TokenOptions
  ): RulesTestContext {
    this.checkNotDestroyed();
    const token = createMockUserToken(
      {
        ...tokenOptions,
        sub: user_id,
        user_id: user_id
      },
      this.projectId
    );
    return this.createContext(token);
  }

  unauthenticatedContext(): RulesTestContext {
    this.checkNotDestroyed();
    return this.createContext(/* authToken = */ undefined);
  }

  async withSecurityRulesDisabled(
    callback: (context: RulesTestContext) => Promise<void>
  ): Promise<void> {
    this.checkNotDestroyed();
    // The "owner" token is recognized by the emulators as a special value that bypasses Security
    // Rules. This should only ever be used in withSecurityRulesDisabled.
    // If you're reading this and thinking about doing this in your own app / tests / scripts, think
    // twice. Instead, just use withSecurityRulesDisabled for unit testing OR connect your Firebase
    // Admin SDKs to the emulators for integration testing via environment variables.
    // See: https://firebase.google.com/docs/emulator-suite/connect_firestore#admin_sdks
    const context = this.createContext('owner');
    try {
      await callback(context);
    } finally {
      // We eagarly clean up this context to actively prevent misuse outside of the callback, e.g.
      // storing the context in a variable.
      context.cleanup();
      this.contexts.delete(context);
    }
  }

  private createContext(authToken: string | undefined): RulesTestContextImpl {
    const context = new RulesTestContextImpl(
      this.projectId,
      this.emulators,
      authToken
    );
    this.contexts.add(context);
    return context;
  }

  clearDatabase(): Promise<void> {
    this.checkNotDestroyed();
    return this.withSecurityRulesDisabled(context => {
      return set(ref(context.database(), '/'), null);
    });
  }

  clearFirestore(): Promise<void> {
    this.checkNotDestroyed();
    throw new Error('Method not implemented.');
  }

  clearStorage(): Promise<void> {
    this.checkNotDestroyed();
    throw new Error('Method not implemented.');
  }

  async cleanup(): Promise<void> {
    this.destroyed = true;
    this.contexts.forEach(context => {
      context.envDestroyed = true;
      context.cleanup();
    });
    this.contexts.clear();
  }

  private checkNotDestroyed() {
    if (this.destroyed) {
      throw new Error(
        'This RulesTestEnvironment has already been cleaned up. ' +
          '(This may indicate a leak or missing `await` in your test cases. If you do intend to ' +
          'perform more tests, please call cleanup() later or create another RulesTestEnvironment.)'
      );
    }
  }
}
/**
 * An implementation of {@code RulesTestContext}. This is private to hide the constructor,
 * which should never be directly called by the developer.
 * @private
 */
class RulesTestContextImpl implements RulesTestContext {
  private app?: FirebaseApp;
  private destroyed = false;
  envDestroyed = false;

  constructor(
    readonly projectId: string,
    readonly emulators: DiscoveredEmulators,
    readonly authToken: string | undefined
  ) {}

  cleanup() {
    this.destroyed = true;
    this.app?.delete();

    this.app = undefined;
  }

  firestore(settings?: FirestoreSettings): Firestore {
    assertEmulatorRunning(this.emulators, 'firestore');
    const firestoreCompat = this.getApp().firestore!();
    if (settings) {
      firestoreCompat.settings(settings);
    }
    const firestore = firestoreCompat as unknown as Firestore;
    connectFirestoreEmulator(
      firestore,
      this.emulators.firestore.host,
      this.emulators.firestore.port,
      { mockUserToken: this.authToken }
    );
    return firestore;
  }
  database(databaseURL?: string): Database {
    assertEmulatorRunning(this.emulators, 'database');
    const database = this.getApp().database!(
      databaseURL
    ) as unknown as Database;
    connectDatabaseEmulator(
      database,
      this.emulators.database.host,
      this.emulators.database.port,
      { mockUserToken: this.authToken }
    );
    return database;
  }
  storage(bucketUrl?: string): FirebaseStorage {
    assertEmulatorRunning(this.emulators, 'storage');
    const storage = this.getApp().storage!(
      bucketUrl
    ) as unknown as FirebaseStorage;
    connectStorageEmulator(
      storage,
      this.emulators.storage.host,
      this.emulators.storage.port,
      { mockUserToken: this.authToken }
    );
    return storage;
  }

  private getApp(): FirebaseApp {
    if (this.envDestroyed) {
      throw new Error(
        'This RulesTestContext is no longer valid because its RulesTestEnvironment has been ' +
          'cleaned up. (This may indicate a leak or missing `await` in your test cases.)'
      );
    }
    if (this.destroyed) {
      throw new Error(
        'This RulesTestContext is no longer valid. When using withSecurityRulesDisabled, ' +
          'make sure to perform all operations on the context within the callback function and ' +
          'return a Promise that resolves when the operations are done.'
      );
    }
    if (!this.app) {
      this.app = firebase.initializeApp(
        { projectId: this.projectId },
        `_Firebase_RulesUnitTesting_${Date.now()}_${Math.random()}`
      );
    }
    return this.app;
  }
}

export function assertEmulatorRunning<E extends keyof DiscoveredEmulators>(
  emulators: DiscoveredEmulators,
  emulator: E
): asserts emulators is Record<E, HostAndPort> {
  if (!emulators[emulator]) {
    if (emulators.hub) {
      throw new Error(
        `The ${emulator} emulator is not running (according to Emulator hub). To force ` +
          'connecting anyway, please specify its host and port in initializeTestEnvironment({...}).'
      );
    } else {
      throw new Error(
        `The host and port of the ${emulator} emulator must be specified. (You may wrap the test ` +
          "script with `firebase emulators:exec './your-test-script'` to enable automatic " +
          `discovery, or specify manually via initializeTestEnvironment({${emulator}: {host, port}}).`
      );
    }
  }
}

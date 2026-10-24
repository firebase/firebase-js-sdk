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

import { FirebaseApp, initializeApp, deleteApp } from '@firebase/app';
import {
  Firestore,
  FirestoreSettings,
  initializeFirestore,
  connectFirestoreEmulator
} from '@firebase/firestore';
import {
  Database,
  getDatabase,
  connectDatabaseEmulator,
  ref as databaseRef,
  set as databaseSet
} from '@firebase/database';
import {
  FirebaseStorage,
  getStorage,
  connectStorageEmulator,
  ref as storageRef,
  listAll,
  deleteObject
} from '@firebase/storage';
import { EmulatorMockTokenOptions } from '@firebase/util';

import {
  HostAndPort,
  RulesTestContext,
  RulesTestEnvironment,
  TokenOptions
} from '../public_types';

import { DiscoveredEmulators } from './discovery';
import { makeUrl } from './url';

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
    return this.createContext({
      ...tokenOptions,
      sub: user_id,
      user_id: user_id
    });
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
      // We eagerly clean up this context to actively prevent misuse outside of the callback, e.g.
      // storing the context in a variable.
      await context.cleanup();
      this.contexts.delete(context);
    }
  }

  private createContext(
    authToken: string | EmulatorMockTokenOptions | undefined
  ): RulesTestContextImpl {
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
      return databaseSet(databaseRef(context.database(), '/'), null);
    });
  }

  async clearFirestore(): Promise<void> {
    this.checkNotDestroyed();
    assertEmulatorRunning(this.emulators, 'firestore');

    const resp = await fetch(
      makeUrl(
        this.emulators.firestore,
        `/emulator/v1/projects/${this.projectId}/databases/(default)/documents`
      ),
      {
        method: 'DELETE'
      }
    );

    if (!resp.ok) {
      throw new Error(await resp.text());
    }
  }

  clearStorage(): Promise<void> {
    this.checkNotDestroyed();
    return this.withSecurityRulesDisabled(async context => {
      const { items } = await listAll(storageRef(context.storage()));
      await Promise.all(
        items.map(item => deleteObject(item))
      );
    });
  }

  async cleanup(): Promise<void> {
    this.destroyed = true;
    await Promise.all(
      Array.from(this.contexts).map(async context => {
        context.envDestroyed = true;
        await context.cleanup();
      })
    );
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
  private firestoreInstance?: Firestore;
  private databaseInstances = new Map<string, Database>();
  private storageInstances = new Map<string, FirebaseStorage>();

  constructor(
    readonly projectId: string,
    readonly emulators: DiscoveredEmulators,
    readonly authToken: EmulatorMockTokenOptions | string | undefined
  ) {}

  async cleanup(): Promise<void> {
    this.destroyed = true;
    if (this.app) {
      await deleteApp(this.app);
      this.app = undefined;
    }
    this.firestoreInstance = undefined;
    this.databaseInstances.clear();
    this.storageInstances.clear();
  }

  firestore(settings?: FirestoreSettings): Firestore {
    assertEmulatorRunning(this.emulators, 'firestore');
    if (!this.firestoreInstance) {
      const firestore = initializeFirestore(this.getApp(), settings ?? {});
      connectFirestoreEmulator(
        firestore,
        this.emulators.firestore.host,
        this.emulators.firestore.port,
        { mockUserToken: this.authToken }
      );
      this.firestoreInstance = firestore;
    } else if (settings) {
      this.firestoreInstance = initializeFirestore(this.getApp(), settings);
    }
    return this.firestoreInstance;
  }
  database(databaseURL?: string): Database {
    assertEmulatorRunning(this.emulators, 'database');
    if (!databaseURL) {
      const url = makeUrl(this.emulators.database, '');
      // Make sure to set the namespace equal to projectId -- otherwise the RTDB SDK will by default
      // use `${projectId}-default-rtdb`, which is treated as a different DB by the RTDB emulator
      // (and thus WON'T apply any rules set for the `projectId` DB during initialization).
      url.searchParams.append('ns', this.projectId);
      databaseURL = url.toString();
    }
    let database = this.databaseInstances.get(databaseURL);
    if (!database) {
      database = getDatabase(this.getApp(), databaseURL);
      connectDatabaseEmulator(
        database,
        this.emulators.database.host,
        this.emulators.database.port,
        { mockUserToken: this.authToken }
      );
      this.databaseInstances.set(databaseURL, database);
    }
    return database;
  }
  storage(bucketUrl = `gs://${this.projectId}`): FirebaseStorage {
    assertEmulatorRunning(this.emulators, 'storage');
    let storage = this.storageInstances.get(bucketUrl);
    if (!storage) {
      storage = getStorage(this.getApp(), bucketUrl);
      connectStorageEmulator(
        storage,
        this.emulators.storage.host,
        this.emulators.storage.port,
        { mockUserToken: this.authToken }
      );
      this.storageInstances.set(bucketUrl, storage);
    }
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
      this.app = initializeApp(
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

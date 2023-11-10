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

import { fetch as undiciFetch } from 'undici';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/database';
import 'firebase/compat/storage';

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
      // We eagarly clean up this context to actively prevent misuse outside of the callback, e.g.
      // storing the context in a variable.
      context.cleanup();
      this.contexts.delete(context);
    }
  }

  private createContext(
    authToken: string | firebase.EmulatorMockTokenOptions | undefined
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
      return context.database().ref('/').set(null);
    });
  }

  async clearFirestore(): Promise<void> {
    this.checkNotDestroyed();
    assertEmulatorRunning(this.emulators, 'firestore');

    const resp = await undiciFetch(
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
      const { items } = await context.storage().ref().listAll();
      await Promise.all(
        items.map(item => {
          return item.delete();
        })
      );
    });
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
  private app?: firebase.app.App;
  private destroyed = false;
  envDestroyed = false;

  constructor(
    readonly projectId: string,
    readonly emulators: DiscoveredEmulators,
    readonly authToken: firebase.EmulatorMockTokenOptions | string | undefined
  ) {}

  cleanup() {
    this.destroyed = true;
    this.app?.delete();

    this.app = undefined;
  }

  firestore(
    settings?: firebase.firestore.Settings
  ): firebase.firestore.Firestore {
    assertEmulatorRunning(this.emulators, 'firestore');
    const firestore = this.getApp().firestore();
    if (settings) {
      firestore.settings(settings);
    }
    firestore.useEmulator(
      this.emulators.firestore.host,
      this.emulators.firestore.port,
      { mockUserToken: this.authToken }
    );
    return firestore;
  }
  database(databaseURL?: string): firebase.database.Database {
    assertEmulatorRunning(this.emulators, 'database');
    if (!databaseURL) {
      const url = makeUrl(this.emulators.database, '');
      // Make sure to set the namespace equal to projectId -- otherwise the RTDB SDK will by default
      // use `${projectId}-default-rtdb`, which is treated as a different DB by the RTDB emulator
      // (and thus WON'T apply any rules set for the `projectId` DB during initialization).
      url.searchParams.append('ns', this.projectId);
      databaseURL = url.toString();
    }
    const database = this.getApp().database(databaseURL);
    database.useEmulator(
      this.emulators.database.host,
      this.emulators.database.port,
      { mockUserToken: this.authToken }
    );
    return database;
  }
  storage(bucketUrl = `gs://${this.projectId}`): firebase.storage.Storage {
    assertEmulatorRunning(this.emulators, 'storage');
    const storage = this.getApp().storage(bucketUrl);
    storage.useEmulator(
      this.emulators.storage.host,
      this.emulators.storage.port,
      { mockUserToken: this.authToken }
    );
    return storage;
  }

  private getApp(): firebase.app.App {
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

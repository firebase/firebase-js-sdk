/**
 * @license
 * Copyright 2019 Google Inc.
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

import { User } from './user';
import { Persistence } from '../core/persistence';
import { UserManager } from '../core/persistence/user_mananger';
import { Deferred } from '../core/util/deferred';
import {
  assert,
  createSubscribe,
  Observer,
  CompleteFn,
  Subscribe,
  NextFn,
  ErrorFn,
  Unsubscribe
} from '@firebase/util';

export interface AuthSettings {
  appVerificationDisabledForTesting: boolean;
}

export interface Config {
  apiKey: string;
  authDomain?: string;
}

export interface PopupRedirectResolver {}

export interface Dependencies {
  // When not provided, in memory persistence is used. Sequence of persistences can also be provided.
  persistence?: Persistence;
  // Popup/Redirect resolver is needed to resolve pending OAuth redirect
  // operations. It can be quite complex and has been separated from Auth.
  // It is also needed for popup operations (same underlying logic).
  popupRedirectResolver?: PopupRedirectResolver;
}

interface Deferrable {
  deferred?: Deferred<void>;
}

/**
 * Attempts to wait for any existing persistence related work to complete.
 *
 * @param deferrable Auth object
 * @param fn callback function to call once any existing deferred promise resolves
 */
async function withLock(
  deferrable: Deferrable,
  fn: () => Promise<void>
): Promise<void> {
  if (deferrable.deferred) {
    await deferrable.deferred.promise;
  }
  deferrable.deferred = new Deferred<void>();
  try {
    await fn();
    deferrable.deferred.resolve();
  } catch (e) {
    deferrable.deferred.reject(e);
  }
  deferrable.deferred = undefined;
}

export class Auth {
  constructor(
    public readonly name: string,
    readonly settings: AuthSettings,
    readonly config: Config,
    public currentUser: User | null = null,
    public languageCode?: string,
    public tenantId?: string
  ) {}
  deferred?: Deferred<void>;
  private onIdTokenChangedObserver: Observer<User | null> | null = null;
  private readonly onIdTokenChangedInternal: Subscribe<User | null> = createSubscribe(
    observer => {
      this.onIdTokenChangedObserver = observer;
    }
  );
  private onAuthStateChangedObserver: Observer<User | null> | null = null;
  private readonly onAuthStateChangedInternal: Subscribe<User | null> = createSubscribe(
    observer => {
      this.onAuthStateChangedObserver = observer;
    }
  );
  private userManager?: UserManager;

  async isInitialized(): Promise<void> {
    if (this.deferred) {
      await this.deferred.promise;
    }
    assert(!this.deferred, 'expect deferred to be undefined');
  }

  async setPersistence(persistence: Persistence): Promise<void> {
    // We may be called synchronously, such as during initialization
    // make sure previous request has finished before trying to change persistence
    return withLock(this, async () => {
      this.userManager = new UserManager(persistence, this.config.apiKey, this.name);
      this.currentUser = await this.userManager.getCurrentUser();
    });
  }

  onIdTokenChanged(
    nextOrObserver: NextFn<User | null> | Observer<User | null>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    if (typeof nextOrObserver === 'function') {
      return this.onIdTokenChangedInternal(nextOrObserver, error, completed);
    } else {
      return this.onIdTokenChangedInternal(nextOrObserver);
    }
  }

  /**
   * Register an observer on user state changes (ie- setCurrentUser)
   *
   * @param nextOrObserver
   * @param error
   * @param completed
   */
  onAuthStateChanged(
    nextOrObserver: NextFn<User | null> | Observer<User | null>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe {
    if (!this.deferred) {
      // If we are already resolved, call observer asynchronously
      Promise.resolve()
        .then(() => {
          if (typeof nextOrObserver === 'function') {
            nextOrObserver(this.currentUser);
          } else {
            nextOrObserver.next(this.currentUser);
          }
        })
        .catch(error);
    }

    if (typeof nextOrObserver === 'function') {
      return this.onAuthStateChangedInternal(nextOrObserver, error, completed);
    } else {
      return this.onAuthStateChangedInternal(nextOrObserver);
    }
  }

  useDeviceLanguage(): void {
    throw new Error('not implemented');
  }

  /**
   * Sets the current user, waiting for any other user mutating methods to complete first.
   *
   * @param user
   */
  async setCurrentUser(user: User): Promise<User> {
    await withLock(this, async () => {
      this.currentUser = user;
      await this.userManager!.setCurrentUser(user);
      if (this.onAuthStateChangedObserver) {
        this.onAuthStateChangedObserver.next(this.currentUser);
      }
    });
    return user;
  }

  /**
   * Clears local persistence, effectively signing-out the user.
   */
  async signOut(): Promise<void> {
    return withLock(this, async () => {
      this.currentUser = null;
      await this.userManager!.removeCurrentUser();
    });
  }
}

/**
 * Alias for Auth.setPersistence
 *
 * @param auth Firebase Auth object
 * @param persistence requested Persistence strategy
 */
export function setPersistence(
  auth: Auth,
  persistence: Persistence
): Promise<void> {
  return auth.setPersistence(persistence);
}

/**
 * Alias for Auth.signOut
 *
 * @param auth Firebase Auth object
 */
export async function signOut(auth: Auth): Promise<void> {
  return auth.signOut();
}

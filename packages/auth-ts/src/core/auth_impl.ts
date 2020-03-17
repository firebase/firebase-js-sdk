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

import { User } from '../model/user';
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
import { PopupRedirectResolver } from '../model/popup_redirect_resolver';
import { Auth, AuthSettings, Config, LanguageCode } from '../model/auth';
import { reloadWithoutSaving } from './account_management/reload';
import { browserSessionPersistence } from './persistence/browser_session';

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

export class AuthImpl implements Auth {
  constructor(
    public readonly name: string,
    readonly settings: AuthSettings,
    public readonly config: Config,
    public currentUser: User | null = null,
    public readonly popupRedirectResolver?: PopupRedirectResolver,
    public languageCode: LanguageCode | null = null,
    public tenantId: string | null = null
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
  private redirectUserManager?: UserManager;
  private redirectUser: User | null = null;

  async isInitialized(): Promise<void> {
    if (this.deferred) {
      await this.deferred.promise;
    }
    assert(!this.deferred, 'expect deferred to be undefined');
  }

  async initializePersistence(
    persistenceHierarchy: Persistence[]
  ): Promise<void> {
    return withLock(this, async () => {
      this.userManager = await UserManager.create(
        this.config.apiKey,
        this.name,
        persistenceHierarchy
      );

      this.redirectUserManager = await UserManager.create(
        this.config.apiKey,
        this.name,
        [browserSessionPersistence],
        'redirectUser'
      );

      let storedUser = await this.userManager.getCurrentUser();
      this.redirectUser = await this.redirectUserManager.getCurrentUser();

      await this.redirectUserManager.removeCurrentUser();

      if (storedUser) {
        // TODO: This will break redirect flows. Redirect flows *SHOULD NOT*
        //       update the user first
        if (
          this.redirectUser?.redirectEventId_ !== storedUser.redirectEventId_
        ) {
          await reloadWithoutSaving(this, storedUser);
        }
      }

      await this.setCurrentUser_(storedUser);
    });
  }

  async setPersistence(persistence: Persistence): Promise<void> {
    // We may be called synchronously, such as during initialization
    // make sure previous request has finished before trying to change persistence
    return withLock(this, async () => {
      await this.userManager!.setPersistence_(persistence);
      const user = await this.userManager!.getCurrentUser();
      await this.setCurrentUser_(user);
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

  getPotentialRedirectUsers_(): User[] {
    const users: User[] = [];
    if (this.currentUser) {
      users.push(this.currentUser);
    }
    if (this.redirectUser) {
      users.push(this.redirectUser);
    }
    return users;
  }

  async setRedirectUser_(user: User): Promise<void> {
    await this.redirectUserManager?.setCurrentUser(user);
  }

  /**
   * Sets the current user, triggering any observable callbacks.
   *
   * Should only be called from inside a withLock() block to prevent race conditions
   *
   * @param user
   */
  private async setCurrentUser_(user: User | null): Promise<void> {
    this.currentUser = user;
    if (user) {
      await this.userManager!.setCurrentUser(user);
    } else {
      await this.userManager!.removeCurrentUser();
    }
    if (this.onAuthStateChangedObserver) {
      this.onAuthStateChangedObserver.next(this.currentUser);
    }
  }

  /**
   * Sets the current user, waiting for any other user mutating methods to complete first.
   *
   * @param user
   */
  async updateCurrentUser(user: User | null): Promise<void> {
    return withLock(this, () => this.setCurrentUser_(user));
  }

  /**
   * Clears local persistence, effectively signing-out the user.
   */
  async signOut(): Promise<void> {
    return withLock(this, () => this.setCurrentUser_(null));
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

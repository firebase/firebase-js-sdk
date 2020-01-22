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
import { assert } from '@firebase/util';

export interface AuthSettings {
  appVerificationDisabledForTesting: boolean;
}

export interface Config {
  apiKey?: string;
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

export type Unsubscribe = () => void;

interface Deferrable {
  deferred?: Deferred<void>;
}

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
    public currentUser?: User,
    public languageCode?: string,
    public tenantId?: string
  ) {}
  deferred?: Deferred<void>;
  userManager?: UserManager;
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
      this.userManager = new UserManager(persistence);
      this.currentUser = await this.userManager.getCurrentUser();
    });
  }
  onIdTokenChanged(
    nextOrObserver: (a: User | null) => any,
    error?: (a: Error) => any,
    completed?: Unsubscribe
  ): Unsubscribe {
    throw new Error('not implemented');
  }
  onAuthStateChanged(
    nextOrObserver: (a: User | null) => any,
    error?: (a: Error) => any,
    completed?: Unsubscribe
  ): Unsubscribe {
    throw new Error('not implemented');
  }
  useDeviceLanguage(): void {
    throw new Error('not implemented');
  }
  async setCurrentUser(user: User): Promise<User> {
    await withLock(this, async () => {
      this.currentUser = user;
      await this.userManager!.setCurrentUser(user);
    });
    return user;
  }
  async signOut(): Promise<void> {
    return withLock(this, async () => {
      this.currentUser = undefined;
      await this.userManager!.removeCurrentUser();
    });
  }
}

export function setPersistence(
  auth: Auth,
  persistence: Persistence
): Promise<void> {
  return auth.setPersistence(persistence);
}

export async function signOut(auth: Auth): Promise<void> {
  return auth.signOut();
}

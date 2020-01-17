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
  async setPersistence(persistence: Persistence): Promise<void> {
    // We may be called synchronously, such as during initialization
    // make sure previous request has finished before trying to change persistence
    if (this.deferred) {
      await this.deferred.promise;
    }
    this.deferred = new Deferred<void>();
    try {
      this.userManager = new UserManager(persistence);
      this.currentUser = await this.userManager.getCurrentUser();
      this.deferred.resolve();
    } catch (e) {
      this.deferred.reject();
    }
    this.deferred = undefined;
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
    this.currentUser = user;
    if (this.userManager) {
      await this.userManager.setCurrentUser(user);
    }
    return user;
  }
  async signOut(): Promise<void> {
    if (this.currentUser === undefined) {
      return;
    }
    this.currentUser = undefined;
    if (this.userManager) {
      await this.userManager.removeCurrentUser();
    }
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

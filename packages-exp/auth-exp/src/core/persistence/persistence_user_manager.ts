/**
 * @license
 * Copyright 2019 Google LLC
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

import { ApiKey, AppName, Auth } from '../../model/auth';
import { User } from '../../model/user';
import { PersistedBlob, Persistence } from '../persistence';
import { UserImpl } from '../user/user_impl';
import { _getInstance } from '../util/instantiator';
import { inMemoryPersistence } from './in_memory';

export const enum KeyName {
  AUTH_USER = 'authUser',
  REDIRECT_USER = 'redirectUser',
  PERSISTENCE_USER = 'persistence'
}
export const enum Namespace {
  PERSISTENCE = 'firebase'
}

export function _persistenceKeyName(
  key: string,
  apiKey: ApiKey,
  appName: AppName
): string {
  return `${Namespace.PERSISTENCE}:${key}:${apiKey}:${appName}`;
}

export class PersistenceUserManager {
  private readonly fullUserKey: string;
  private readonly fullPersistenceKey: string;
  private readonly boundEventHandler: () => void;

  private constructor(
    public persistence: Persistence,
    private readonly auth: Auth,
    private readonly userKey: string
  ) {
    const { config, name } = this.auth;
    this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
    this.fullPersistenceKey = _persistenceKeyName(
      KeyName.PERSISTENCE_USER,
      config.apiKey,
      name
    );
    this.boundEventHandler = auth._onStorageEvent.bind(auth);
    this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
  }

  setCurrentUser(user: User): Promise<void> {
    return this.persistence._set(this.fullUserKey, user.toJSON());
  }

  async getCurrentUser(): Promise<User | null> {
    const blob = await this.persistence._get<PersistedBlob>(this.fullUserKey);
    return blob ? UserImpl._fromJSON(this.auth, blob) : null;
  }

  removeCurrentUser(): Promise<void> {
    return this.persistence._remove(this.fullUserKey);
  }

  savePersistenceForRedirect(): Promise<void> {
    return this.persistence._set(
      this.fullPersistenceKey,
      this.persistence.type
    );
  }

  async setPersistence(newPersistence: Persistence): Promise<void> {
    if (this.persistence.type === newPersistence.type) {
      return;
    }

    const currentUser = await this.getCurrentUser();
    await this.removeCurrentUser();

    this.persistence = newPersistence;

    if (currentUser) {
      return this.setCurrentUser(currentUser);
    }
  }

  delete(): void {
    this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
  }

  static async create(
    auth: Auth,
    persistenceHierarchy: Persistence[],
    userKey = KeyName.AUTH_USER
  ): Promise<PersistenceUserManager> {
    if (!persistenceHierarchy.length) {
      return new PersistenceUserManager(
        _getInstance(inMemoryPersistence),
        auth,
        userKey
      );
    }

    const key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name);
    for (const persistence of persistenceHierarchy) {
      if (await persistence._get(key)) {
        return new PersistenceUserManager(persistence, auth, userKey);
      }
    }

    // Check all the available storage options.
    // TODO: Migrate from local storage to indexedDB
    // TODO: Clear other forms once one is found

    // All else failed, fall back to zeroth persistence
    // TODO: Modify this to support non-browser devices
    return new PersistenceUserManager(persistenceHierarchy[0], auth, userKey);
  }
}

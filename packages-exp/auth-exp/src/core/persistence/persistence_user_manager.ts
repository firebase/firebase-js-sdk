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

export const _AUTH_USER_KEY_NAME = 'authUser';
export const _REDIRECT_USER_KEY_NAME = 'redirectUser';
export const _PERSISTENCE_KEY_NAME = 'persistence';
const PERSISTENCE_NAMESPACE = 'firebase';

function _persistenceKeyName(
  key: string,
  apiKey: ApiKey,
  appName: AppName
): string {
  return `${PERSISTENCE_NAMESPACE}:${key}:${apiKey}:${appName}`;
}

export class PersistenceUserManager {
  private readonly fullUserKey: string;
  private readonly fullPersistenceKey: string;

  private constructor(
    public persistence: Persistence,
    private readonly auth: Auth,
    private readonly userKey: string
  ) {
    const { config, name } = this.auth;
    this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
    this.fullPersistenceKey = _persistenceKeyName(
      _PERSISTENCE_KEY_NAME,
      config.apiKey,
      name
    );
    this.persistence.addListener(this.fullUserKey, auth._onStorageEvent.bind(auth));
  }

  setCurrentUser(user: User): Promise<void> {
    return this.persistence.set(this.fullUserKey, user.toJSON());
  }

  async getCurrentUser(): Promise<User | null> {
    const blob = await this.persistence.get<PersistedBlob>(this.fullUserKey);
    return blob ? UserImpl._fromJSON(this.auth, blob) : null;
  }

  removeCurrentUser(): Promise<void> {
    return this.persistence.remove(this.fullUserKey);
  }

  savePersistenceForRedirect(): Promise<void> {
    return this.persistence.set(this.fullPersistenceKey, this.persistence.type);
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
    this.persistence.removeListener(
      this.fullUserKey,
      this.auth._onStorageEvent
    );
  }

  static async create(
    auth: Auth,
    persistenceHierarchy: Persistence[],
    userKey = _AUTH_USER_KEY_NAME
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
      if (await persistence.get(key)) {
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

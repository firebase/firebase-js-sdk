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

import { Persistence } from '../persistence';
import { User } from '../../model/user';
import { ApiKey, AppName } from '../../model/auth';
import { inMemoryPersistence } from './in_memory';

export const AUTH_USER_KEY_NAME_ = 'authUser';
export const PERSISTENCE_KEY_NAME_ = 'persistence';
const PERSISTENCE_NAMESPACE_ = 'firebase';

export function persistenceKeyName_(
  key: string,
  apiKey: ApiKey,
  appName: AppName
): string {
  return `${PERSISTENCE_NAMESPACE_}:${key}:${apiKey}:${appName}`;
}

export class UserManager {
  private constructor(
    public persistence: Persistence,
    private readonly apiKey: ApiKey,
    private readonly appName: AppName,
    private readonly userKey: string
  ) {}

  fullKeyName_(key: string): string {
    return persistenceKeyName_(key, this.apiKey, this.appName);
  }

  setCurrentUser(user: User): Promise<void> {
    return this.persistence.set(this.fullKeyName_(this.userKey), user);
  }

  async getCurrentUser(): Promise<User | null> {
    return this.persistence.get<User>(
      this.fullKeyName_(this.userKey),
      User.fromPlainObject
    );
  }

  removeCurrentUser(): Promise<void> {
    return this.persistence.remove(this.fullKeyName_(this.userKey));
  }

  savePersistenceForRedirect(): Promise<void> {
    return this.persistence.set(
      this.fullKeyName_(PERSISTENCE_KEY_NAME_),
      this.persistence.type
    );
  }

  async setPersistence_(newPersistence: Persistence): Promise<void> {
    if (this.persistence.type === newPersistence.type) {
      return;
    }

    const currentUser = await this.getCurrentUser();
    this.removeCurrentUser();

    this.persistence = newPersistence;

    if (currentUser) {
      this.setCurrentUser(currentUser);
    }
  }

  static async create(
    apiKey: ApiKey,
    appName: AppName,
    persistenceHierarchy: Persistence[],
    userKey = AUTH_USER_KEY_NAME_
  ): Promise<UserManager> {
    if (!persistenceHierarchy.length) {
      return new UserManager(inMemoryPersistence, apiKey, appName, userKey);
    }

    const key = persistenceKeyName_(userKey, apiKey, appName);
    for (const persistence of persistenceHierarchy) {
      if (await persistence.get<User>(key)) {
        return new UserManager(persistence, apiKey, appName, userKey);
      }
    }

    // Check all the available storage options.
    // TODO: Migrate from local storage to indexedDB
    // TODO: Clear other forms once one is found

    // All else failed, fall back to zeroth persistence
    // TODO: Modify this to support non-browser devices
    return new UserManager(persistenceHierarchy[0], apiKey, appName, userKey);
  }
}

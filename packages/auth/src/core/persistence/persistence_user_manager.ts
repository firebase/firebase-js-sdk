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

import { ApiKey, AppName, AuthInternal } from '../../model/auth';
import { UserInternal } from '../../model/user';
import { PersistedBlob, PersistenceInternal } from '../persistence';
import { UserImpl } from '../user/user_impl';
import { _getInstance } from '../util/instantiator';
import { inMemoryPersistence } from './in_memory';

export const enum KeyName {
  AUTH_USER = 'authUser',
  AUTH_EVENT = 'authEvent',
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
    public persistence: PersistenceInternal,
    private readonly auth: AuthInternal,
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

  setCurrentUser(user: UserInternal): Promise<void> {
    return this.persistence._set(this.fullUserKey, user.toJSON());
  }

  async getCurrentUser(): Promise<UserInternal | null> {
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

  async setPersistence(newPersistence: PersistenceInternal): Promise<void> {
    if (this.persistence === newPersistence) {
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
    auth: AuthInternal,
    persistenceHierarchy: PersistenceInternal[],
    userKey = KeyName.AUTH_USER
  ): Promise<PersistenceUserManager> {
    if (!persistenceHierarchy.length) {
      return new PersistenceUserManager(
        _getInstance(inMemoryPersistence),
        auth,
        userKey
      );
    }

    // Eliminate any persistences that are not available
    const availablePersistences = (
      await Promise.all(
        persistenceHierarchy.map(async persistence => {
          if (await persistence._isAvailable()) {
            return persistence;
          }
          return undefined;
        })
      )
    ).filter(persistence => persistence) as PersistenceInternal[];

    // Fall back to the first persistence listed, or in memory if none available
    let selectedPersistence =
      availablePersistences[0] ||
      _getInstance<PersistenceInternal>(inMemoryPersistence);

    const key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name);

    // Pull out the existing user, setting the chosen persistence to that
    // persistence if the user exists.
    let userToMigrate: UserInternal | null = null;
    // Note, here we check for a user in _all_ persistences, not just the
    // ones deemed available. If we can migrate a user out of a broken
    // persistence, we will (but only if that persistence supports migration).
    for (const persistence of persistenceHierarchy) {
      try {
        const blob = await persistence._get<PersistedBlob>(key);
        if (blob) {
          const user = UserImpl._fromJSON(auth, blob); // throws for unparsable blob (wrong format)
          if (persistence !== selectedPersistence) {
            userToMigrate = user;
          }
          selectedPersistence = persistence;
          break;
        }
      } catch {}
    }

    // If we find the user in a persistence that does support migration, use
    // that migration path (of only persistences that support migration)
    const migrationHierarchy = availablePersistences.filter(
      p => p._shouldAllowMigration
    );

    // If the persistence does _not_ allow migration, just finish off here
    if (
      !selectedPersistence._shouldAllowMigration ||
      !migrationHierarchy.length
    ) {
      return new PersistenceUserManager(selectedPersistence, auth, userKey);
    }

    selectedPersistence = migrationHierarchy[0];
    if (userToMigrate) {
      // This normally shouldn't throw since chosenPersistence.isAvailable() is true, but if it does
      // we'll just let it bubble to surface the error.
      await selectedPersistence._set(key, userToMigrate.toJSON());
    }

    // Attempt to clear the key in other persistences but ignore errors. This helps prevent issues
    // such as users getting stuck with a previous account after signing out and refreshing the tab.
    await Promise.all(
      persistenceHierarchy.map(async persistence => {
        if (persistence !== selectedPersistence) {
          try {
            await persistence._remove(key);
          } catch {}
        }
      })
    );
    return new PersistenceUserManager(selectedPersistence, auth, userKey);
  }
}

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

export const AUTH_USER_KEY_NAME_ = 'authUser';
export const PERSISTENCE_KEY_NAME_ = 'persistence';
const NAMESPACE_ = 'firebase';

export function fullKeyName_(
  key: string,
  apiKey: ApiKey,
  appName: AppName
): string {
  return `${NAMESPACE_}:${key}:${apiKey}:${appName}`;
}

export class UserManager {
  constructor(
    public persistence: Persistence,
    private readonly apiKey: ApiKey,
    private readonly appName: AppName
  ) {}

  fullKeyName_(key: string): string {
    return fullKeyName_(key, this.apiKey, this.appName);
  }

  setCurrentUser(user: User): Promise<void> {
    return this.persistence.set(this.fullKeyName_(AUTH_USER_KEY_NAME_), user);
  }

  async getCurrentUser(): Promise<User | null> {
    return this.persistence.get<User>(this.fullKeyName_(AUTH_USER_KEY_NAME_));
  }

  removeCurrentUser(): Promise<void> {
    return this.persistence.remove(this.fullKeyName_(AUTH_USER_KEY_NAME_));
  }

  savePersistenceForRedirect(): Promise<void> {
    return this.persistence.set(
      this.fullKeyName_(PERSISTENCE_KEY_NAME_),
      this.persistence.type
    );
  }
}

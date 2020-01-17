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

import { Persistence } from '.';
import { User } from '../../model/user';

const AUTH_USER_KEY_NAME_ = 'authUser';

export class UserManager {
  constructor(public persistence: Persistence) {}

  setCurrentUser(user: User): Promise<void> {
    return this.persistence.set(AUTH_USER_KEY_NAME_, JSON.stringify(user));
  }

  async getCurrentUser(): Promise<User | undefined> {
    const json = await this.persistence.get(AUTH_USER_KEY_NAME_);
    if (!json) {
      return undefined;
    }
    return JSON.parse(json);
  }

  removeCurrentUser(): Promise<void> {
    return this.persistence.remove(AUTH_USER_KEY_NAME_);
  }
}

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

import { IdTokenResult, IdToken, parseIdToken } from './id_token';

export interface UserInfo {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
}

export class User implements UserInfo {
  constructor(
    public readonly refreshToken: string,
    public readonly uid: string,
    private idToken: IdToken,
    public readonly isAnonymous: boolean = false,
    public readonly displayName = null,
    public readonly email = null,
    public readonly phoneNumber = null,
    public readonly photoURL = null
  ) {}

  getIdToken(forceRefresh: boolean = false): Promise<IdToken> {
    return Promise.resolve(this.idToken);
  }

  async getIdTokenResult(
    forceRefresh: boolean = false
  ): Promise<IdTokenResult> {
    return parseIdToken(this.idToken);
  }

  reload(): Promise<void> {
    throw new Error("not implemented");
  }
}

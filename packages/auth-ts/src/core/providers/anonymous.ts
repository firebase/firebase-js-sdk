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

import { ProviderId, SignInMethod, AuthProvider } from '.';
import { Auth } from '../..';
import { IdTokenResponse } from '../../model/id_token';
import { signUp } from '../../api/authentication';
import { AuthCredential } from '../../model/auth_credential';

export class AnonymousCredential implements AuthCredential {
  providerId = ProviderId.ANONYMOUS;
  signInMethod = SignInMethod.ANONYMOUS;
  toJSON(): object {
    throw new Error('Method not implemented.');
  }
  async getIdTokenResponse_(auth: Auth): Promise<IdTokenResponse> {
    return signUp(auth, {
      returnSecureToken: true
    });
  }
  async linkToIdToken_(auth: Auth, idToken: string): Promise<IdTokenResponse> {
    throw new Error("Can't link to an anonymous cred");
  }
}

export class AnonymousProvider implements AuthProvider {
  providerId = ProviderId.ANONYMOUS;
  static credential(): AnonymousCredential {
    return new AnonymousCredential();
  }
}

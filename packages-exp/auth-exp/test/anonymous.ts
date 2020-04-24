/**
 * @license
 * Copyright 2020 Google LLC
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

import { AuthCredential, ProviderId, SignInMethod, AuthProvider } from "@firebase/auth-types-exp";
import { signUp } from '../src/api/authentication/sign_up';
import { debugFail } from '../src/core/util/assert';
import { Auth } from '../src/model/auth';
import { IdTokenResponse } from "../src/model/id_token";

export class AnonymousCredential implements AuthCredential {
  providerId = ProviderId.ANONYMOUS;
  signInMethod = SignInMethod.ANONYMOUS;

  toJSON(): never {
    debugFail('Method not implemented.');
  }

  fromJSON(): never {
    debugFail('Method not implemented');
  }

  async _getIdTokenResponse(auth: Auth): Promise<IdTokenResponse> {
    return signUp(auth, {
      returnSecureToken: true
    });
  }

  async _linkToIdToken(_auth: Auth, _idToken: string): Promise<never> {
    debugFail("Can't link to an anonymous credential");
  }

  _matchIdTokenWithUid(_auth: Auth, _uid: string): Promise<never> {
    debugFail('Method not implemented.');
  }
}

export class AnonymousProvider implements AuthProvider {
  providerId = ProviderId.ANONYMOUS;

  static credential(): AnonymousCredential {
    return new AnonymousCredential();
  }
}

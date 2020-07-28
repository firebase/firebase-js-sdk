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

import * as externs from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { TaggedWithTokenResponse } from '../../model/id_token';
import { UserCredential } from '../../model/user';
import { OAuthCredential } from '../credentials/oauth';
import { OAuthProvider } from './oauth';

export class GoogleAuthProvider extends OAuthProvider {
  static readonly GOOGLE_SIGN_IN_METHOD = externs.SignInMethod.GOOGLE;
  static readonly PROVIDER_ID = externs.ProviderId.GOOGLE;
  readonly providerId = GoogleAuthProvider.PROVIDER_ID;

  static credential(
    idToken?: string | null,
    accessToken?: string | null
  ): externs.OAuthCredential {
    return OAuthCredential._fromParams({
      providerId: GoogleAuthProvider.PROVIDER_ID,
      signInMethod: GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD,
      idToken,
      accessToken
    });
  }

  static credentialFromResult(
    userCredential: externs.UserCredential
  ): externs.OAuthCredential | null {
    return GoogleAuthProvider.credentialFromTaggedObject(
      userCredential as UserCredential
    );
  }

  static credentialFromError(
    error: FirebaseError
  ): externs.OAuthCredential | null {
    return GoogleAuthProvider.credentialFromTaggedObject(
      error as TaggedWithTokenResponse
    );
  }

  private static credentialFromTaggedObject({
    _tokenResponse: tokenResponse
  }: TaggedWithTokenResponse): externs.OAuthCredential | null {
    if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
      return null;
    }

    try {
      return GoogleAuthProvider.credential(
        tokenResponse.idToken,
        tokenResponse.oauthAccessToken
      );
    } catch {
      return null;
    }
  }
}

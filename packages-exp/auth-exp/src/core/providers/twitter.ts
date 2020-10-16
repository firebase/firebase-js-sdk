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

/**
 * @license
 * Copyright 2020 Twitter LLC
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

import { SignInWithIdpResponse } from '../../api/authentication/idp';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { UserCredential } from '../../model/user';
import { OAuthCredential } from '../credentials/oauth';
import { OAuthProvider } from './oauth';

export class TwitterAuthProvider extends OAuthProvider {
  static readonly TWITTER_SIGN_IN_METHOD = externs.SignInMethod.TWITTER;
  static readonly PROVIDER_ID = externs.ProviderId.TWITTER;
  
  constructor() {
    super(externs.ProviderId.TWITTER);
  }

  static credential(token: string, secret: string): externs.OAuthCredential {
    return OAuthCredential._fromParams({
      providerId: TwitterAuthProvider.PROVIDER_ID,
      signInMethod: TwitterAuthProvider.TWITTER_SIGN_IN_METHOD,
      oauthToken: token,
      oauthTokenSecret: secret
    });
  }

  static credentialFromResult(
    userCredential: externs.UserCredential
  ): externs.OAuthCredential | null {
    return TwitterAuthProvider.credentialFromTaggedObject(
      userCredential as UserCredential
    );
  }

  static credentialFromError(
    error: FirebaseError
  ): externs.OAuthCredential | null {
    return TwitterAuthProvider.credentialFromTaggedObject(
      error as TaggedWithTokenResponse
    );
  }

  private static credentialFromTaggedObject({
    _tokenResponse: tokenResponse
  }: TaggedWithTokenResponse): externs.OAuthCredential | null {
    if (!tokenResponse) {
      return null;
    }
    const {
      oauthAccessToken,
      oauthTokenSecret
    } = tokenResponse as SignInWithIdpResponse;
    if (!oauthAccessToken || !oauthTokenSecret) {
      return null;
    }

    try {
      return TwitterAuthProvider.credential(oauthAccessToken, oauthTokenSecret);
    } catch {
      return null;
    }
  }
}

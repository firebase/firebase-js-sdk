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

/**
 * Provider for generating an {@link OAuthCredential} for {@link @firebase/auth-types#ProviderId.GITHUB}.
 *
 * @remarks
 * GitHub requires an OAuth 2.0 redirect, so you can either handle the redirect directly, or use
 * the {@link signInWithPopup} handler:
 *
 * @example
 * ```javascript
 * // Using a redirect.
 * const result = await getRedirectResult(auth);
 * if (result.credential) {
 *   // This gives you a GitHub Access Token.
 *   const token = result.credential.accessToken;
 * }
 * const user = result.user;
 *
 * // Start a sign in process for an unauthenticated user.
 * const provider = new GithubAuthProvider();
 * provider.addScope('repo');
 * await signInWithRedirect(auth, provider);
 * ```
 *
 * @example
 * ```javascript
 * // With popup.
 * const provider = new GithubAuthProvider();
 * provider.addScope('repo');
 * const result = await signInWithPopup(auth, provider);
 * // This gives you a GitHub Access Token.
 * const token = result.credential.accessToken;
 * // The signed-in user info.
 * const user = result.user;
 * ```
 *
 * @public
 */
export class GithubAuthProvider extends OAuthProvider {
  /** Always set to {@link @firebase/auth-types#SignInMethod.GITHUB}. */
  static readonly GITHUB_SIGN_IN_METHOD = externs.SignInMethod.GITHUB;
  /** Always set to {@link @firebase/auth-types#ProviderId.GITHUB}. */
  static readonly PROVIDER_ID = externs.ProviderId.GITHUB;

  constructor() {
    super(externs.ProviderId.GITHUB);
  }

  /**
   * Creates a credential for Github.
   *
   * @param accessToken - Github access token.
   */
  static credential(accessToken: string): externs.OAuthCredential {
    return OAuthCredential._fromParams({
      providerId: GithubAuthProvider.PROVIDER_ID,
      signInMethod: GithubAuthProvider.GITHUB_SIGN_IN_METHOD,
      accessToken
    });
  }

  static credentialFromResult(
    userCredential: externs.UserCredential
  ): externs.OAuthCredential | null {
    return GithubAuthProvider.credentialFromTaggedObject(
      userCredential as UserCredential
    );
  }

  static credentialFromError(
    error: FirebaseError
  ): externs.OAuthCredential | null {
    return GithubAuthProvider.credentialFromTaggedObject(
      (error.customData || {}) as TaggedWithTokenResponse
    );
  }

  private static credentialFromTaggedObject({
    _tokenResponse: tokenResponse
  }: TaggedWithTokenResponse): externs.OAuthCredential | null {
    if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
      return null;
    }

    if (!tokenResponse.oauthAccessToken) {
      return null;
    }

    try {
      return GithubAuthProvider.credential(tokenResponse.oauthAccessToken);
    } catch {
      return null;
    }
  }
}

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

import * as externs from '@firebase/auth-types-exp';

import { _assert } from '../util/assert';
import { AuthErrorCode } from '../errors';

import { OAuthCredential } from '../credentials/oauth';

/**
 * Map of OAuth Custom Parameters.
 *
 * @public
 */
export type CustomParameters = Record<string, string>;

/**
 * Defines the options for initializing an {@link OAuthCredential}.
 *
 * @remarks
 * For ID tokens with nonce claim, the raw nonce has to also be provided.
 *
 * @public
 */
export interface OAuthCredentialOptions {
  /**
   * The OAuth ID token used to initialize the {@link OAuthCredential}.
   */
  idToken?: string;
  /**
   * The OAuth access token used to initialize the {@link OAuthCredential}.
   */
  accessToken?: string;
  /**
   * The raw nonce associated with the ID token.
   *
   * @remarks
   * It is required when an ID token with a nonce field is provided. The SHA-256 hash of the
   * raw nonce must match the nonce field in the ID token.
   */
  rawNonce?: string;
}

/**
 * Provider for generating generic {@link OAuthCredential}.
 *
 * @example
 * ```javascript
 * // Sign in using a redirect.
 * const provider = new OAuthProvider('google.com');
 * // Start a sign in process for an unauthenticated user.
 * provider.addScope('profile');
 * provider.addScope('email');
 * await signInWithRedirect(auth, provider);
 * // This will trigger a full page redirect away from your app
 *
 * // After returning from the redirect when your app initializes you can obtain the result
 * const result = await getRedirectResult(auth);
 * if (result) {
 *   // This is the signed-in user
 *   const user = result.user;
 *   // This gives you a OAuth Access Token for the provider.
 *   const credential = provider.credentialFromResult(auth, result);
 *   const token = credential.accessToken;
 * }
 * ```
 *
 * @example
 * ```javascript
 * // Sign in using a popup.
 * const provider = new OAuthProvider('google.com');
 * provider.addScope('profile');
 * provider.addScope('email');
 * const result = await signInWithPopup(auth, provider);
 *
 * // The signed-in user info.
 * const user = result.user;
 * // This gives you a OAuth Access Token for the provider.
 * const credential = provider.credentialFromResult(auth, result);
 * const token = credential.accessToken;
 * ```
 * @public
 */
export class OAuthProvider implements externs.AuthProvider {
  /** @internal */
  defaultLanguageCode: string | null = null;
  /** @internal */
  private scopes: string[] = [];
  /** @internal */
  private customParameters: CustomParameters = {};

  /**
   * Constructor for generic OAuth providers.
   *
   * @param providerId - Provider for which credentials should be generated.
   */
  constructor(readonly providerId: string) {}

  static credentialFromJSON(json: object | string): externs.OAuthCredential {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    _assert(
      'providerId' in obj && 'signInMethod' in obj,
      AuthErrorCode.ARGUMENT_ERROR
    );
    return OAuthCredential._fromParams(obj);
  }

  /**
   * Creates a {@link OAuthCredential} from a generic OAuth provider's access token or ID token.
   *
   * @remarks
   * The raw nonce is required when an ID token with a nonce field is provided. The SHA-256 hash of
   * the raw nonce must match the nonce field in the ID token.
   *
   * @example
   * ```javascript
   * // `googleUser` from the onsuccess Google Sign In callback.
   * // Initialize a generate OAuth provider with a `google.com` providerId.
   * const provider = new OAuthProvider('google.com');
   * const credential = provider.credential({
   *   idToken: googleUser.getAuthResponse().id_token,
   * });
   * const result = await signInWithCredential(credential);
   * ```
   *
   * @param params - Either the options object containing the ID token, access token and raw nonce
   * or the ID token string.
   */
  credential(params: OAuthCredentialOptions): externs.OAuthCredential {
    _assert(params.idToken && params.accessToken, AuthErrorCode.ARGUMENT_ERROR);
    // For OAuthCredential, sign in method is same as providerId.
    return OAuthCredential._fromParams({
      providerId: this.providerId,
      signInMethod: this.providerId,
      ...params
    });
  }

  /**
   * Set the language gode.
   *
   * @param languageCode - language code
   */
  setDefaultLanguage(languageCode: string | null): void {
    this.defaultLanguageCode = languageCode;
  }

  /**
   * Sets the OAuth custom parameters to pass in an OAuth request for popup and redirect sign-in
   * operations.
   *
   * @remarks
   * For a detailed list, check the reserved required OAuth 2.0 parameters such as `client_id`,
   * `redirect_uri`, `scope`, `response_type`, and `state` are not allowed and will be ignored.
   *
   * @param customOAuthParameters - The custom OAuth parameters to pass in the OAuth request.
   */
  setCustomParameters(
    customOAuthParameters: CustomParameters
  ): externs.AuthProvider {
    this.customParameters = customOAuthParameters;
    return this;
  }

  /**
   * Retrieve the current list of {@link CustomParameters}.
   */
  getCustomParameters(): CustomParameters {
    return this.customParameters;
  }

  /**
   * Add an OAuth scope to the credential.
   *
   * @param scope - Provider OAuth scope to add.
   */
  addScope(scope: string): externs.AuthProvider {
    // If not already added, add scope to list.
    if (!this.scopes.includes(scope)) {
      this.scopes.push(scope);
    }
    return this;
  }

  /**
   * Retrieve the current list of OAuth scopes.
   */
  getScopes(): string[] {
    return [...this.scopes];
  }
}

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

import { AuthErrorCode } from '../errors';

export interface CustomParameters {
  [key: string]: string;
}

interface CredentialParameters {
  idToken?: string;
  accessToken?: string;
  rawNonce?: string;
}

export class OAuthProvider implements externs.AuthProvider {
  defaultLanguageCode: string | null = null;
  private scopes: string[] = [];
  private customParameters: CustomParameters = {};
  constructor(readonly providerId: externs.ProviderId) {}
  static credentialFromResult(
    userCredential: externs.UserCredential
  ): externs.OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthErrorCode): externs.OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): externs.OAuthCredential {
    throw new Error('not implemented');
  }

  credential(params: CredentialParameters): externs.OAuthCredential {
    throw new Error('no');
  }

  setDefaultLanguage(languageCode: string | null): void {
    this.defaultLanguageCode = languageCode;
  }

  setCustomParameters(customOAuthParameters: CustomParameters): externs.AuthProvider {
    this.customParameters = customOAuthParameters;
    return this;
  }

  getCustomParameters(): CustomParameters {
    return this.customParameters;
  }

  addScope(scope: string) {
    // If not already added, add scope to list.
    if (!this.scopes.includes(scope)) {
      this.scopes.push(scope);
    }
    return this;
  }

  getScopes() {
    return this.scopes;
  }
}

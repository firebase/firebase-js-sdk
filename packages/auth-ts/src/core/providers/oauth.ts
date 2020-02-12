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

import { AuthProvider, ProviderId } from '../providers';
import { UserCredential } from '../../model/user_credential';
import { OAuthCredential } from '../strategies/auth_credential';
import { AuthErrorCode } from '../errors';
import { LanguageCode } from '../../model/auth';

export interface CustomParameters {
  [key: string]: string;
}

export class OAuthProvider implements AuthProvider {
  private defaultLanguageCode: LanguageCode | null = null;
  private scopes: string[] = [];
  private customParameters: CustomParameters = {};
  constructor(readonly providerId: ProviderId) {}
  static credentialFromResult(
    userCredential: UserCredential
  ): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthErrorCode): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): OAuthCredential {
    throw new Error('not implemented');
  }
  setDefaultLanguage(languageCode: LanguageCode | null): void {
    this.defaultLanguageCode = languageCode;
  }
  setCustomParameters(customOAuthParameters: CustomParameters): AuthProvider {
    this.customParameters = customOAuthParameters;
    throw new Error('not implemented');
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

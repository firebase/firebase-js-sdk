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

import { assertTypes, debugFail } from '../util/assert';

export type CustomParameters = Record<string, string>;

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

  static credentialFromJSON(_json: object): externs.OAuthCredential {
    debugFail('not implemented');
  }

  credential(_params: CredentialParameters): externs.OAuthCredential {
    debugFail('not implemented');
  }

  setDefaultLanguage(languageCode: string | null): void {
    assertTypes(arguments, 'string|null');
    this.defaultLanguageCode = languageCode;
  }

  setCustomParameters(
    customOAuthParameters: CustomParameters
  ): externs.AuthProvider {
    this.customParameters = customOAuthParameters;
    return this;
  }

  getCustomParameters(): CustomParameters {
    return this.customParameters;
  }

  addScope(scope: string): externs.AuthProvider {
    assertTypes(arguments, 'string');
    // If not already added, add scope to list.
    if (!this.scopes.includes(scope)) {
      this.scopes.push(scope);
    }
    return this;
  }

  getScopes(): string[] {
    return [...this.scopes];
  }
}

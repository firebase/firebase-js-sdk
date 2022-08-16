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
 * Represents the SAML credentials returned by an {@link SAMLAuthProvider}.
 *
 * @public
 */

import {
  signInWithIdp,
  SignInWithIdpRequest
} from '../../api/authentication/idp';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { AuthCredential } from './auth_credential';

const IDP_REQUEST_URI = 'http://localhost';

/**
 * @public
 */
export class SAMLAuthCredential extends AuthCredential {
  /** @internal */
  private constructor(
    providerId: string,
    private readonly pendingToken: string
  ) {
    super(providerId, providerId);
  }

  /** @internal */
  _getIdTokenResponse(auth: AuthInternal): Promise<IdTokenResponse> {
    const request = this.buildRequest();
    return signInWithIdp(auth, request);
  }

  /** @internal */
  _linkToIdToken(
    auth: AuthInternal,
    idToken: string
  ): Promise<IdTokenResponse> {
    const request = this.buildRequest();
    request.idToken = idToken;
    return signInWithIdp(auth, request);
  }

  /** @internal */
  _getReauthenticationResolver(auth: AuthInternal): Promise<IdTokenResponse> {
    const request = this.buildRequest();
    request.autoCreate = false;
    return signInWithIdp(auth, request);
  }

  /** {@inheritdoc AuthCredential.toJSON}  */
  toJSON(): object {
    return {
      signInMethod: this.signInMethod,
      providerId: this.providerId,
      pendingToken: this.pendingToken
    };
  }

  /**
   * Static method to deserialize a JSON representation of an object into an
   * {@link  AuthCredential}.
   *
   * @param json - Input can be either Object or the stringified representation of the object.
   * When string is provided, JSON.parse would be called first.
   *
   * @returns If the JSON input does not represent an {@link  AuthCredential}, null is returned.
   */
  static fromJSON(json: string | object): SAMLAuthCredential | null {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const { providerId, signInMethod, pendingToken }: Record<string, string> =
      obj;
    if (
      !providerId ||
      !signInMethod ||
      !pendingToken ||
      providerId !== signInMethod
    ) {
      return null;
    }

    return new SAMLAuthCredential(providerId, pendingToken);
  }

  /**
   * Helper static method to avoid exposing the constructor to end users.
   *
   * @internal
   */
  static _create(providerId: string, pendingToken: string): SAMLAuthCredential {
    return new SAMLAuthCredential(providerId, pendingToken);
  }

  private buildRequest(): SignInWithIdpRequest {
    return {
      requestUri: IDP_REQUEST_URI,
      returnSecureToken: true,
      pendingToken: this.pendingToken
    };
  }
}

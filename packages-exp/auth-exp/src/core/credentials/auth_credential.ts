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

import { PhoneOrOauthTokenResponse } from '../../api/authentication/mfa';
import { AuthInternal } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { debugFail } from '../util/assert';

/**
 * Interface that represents the credentials returned by an {@link AuthProvider}.
 *
 * @remarks
 * Implementations specify the details about each auth provider's credential requirements.
 *
 * @public
 */
export class AuthCredential {
  /** @internal */
  protected constructor(
    /**
     * The authentication provider ID for the credential.
     *
     * @remarks
     * For example, 'facebook.com', or 'google.com'.
     */
    readonly providerId: string,
    /**
     * The authentication sign in method for the credential.
     *
     * @remarks
     * For example, {@link SignInMethod}.EMAIL_PASSWORD, or
     * {@link SignInMethod}.EMAIL_LINK. This corresponds to the sign-in method
     * identifier as returned in {@link fetchSignInMethodsForEmail}.
     */
    readonly signInMethod: string
  ) {}

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns a JSON-serializable representation of this object.
   */
  toJSON(): object {
    return debugFail('not implemented');
  }

  /** @internal */
  _getIdTokenResponse(_auth: AuthInternal): Promise<PhoneOrOauthTokenResponse> {
    return debugFail('not implemented');
  }
  /** @internal */
  _linkToIdToken(
    _auth: AuthInternal,
    _idToken: string
  ): Promise<IdTokenResponse> {
    return debugFail('not implemented');
  }
  /** @internal */
  _getReauthenticationResolver(_auth: AuthInternal): Promise<IdTokenResponse> {
    return debugFail('not implemented');
  }
}

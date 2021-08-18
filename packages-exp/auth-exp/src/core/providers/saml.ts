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

import { FirebaseError } from '@firebase/util';
import { SignInWithIdpResponse } from '../../api/authentication/idp';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { UserCredential } from '../../model/public_types';
import { UserCredentialInternal } from '../../model/user';
import { AuthCredential } from '../credentials';
import { SAMLAuthCredential } from '../credentials/saml';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';
import { FederatedAuthProvider } from './federated';

const SAML_PROVIDER_PREFIX = 'saml.';

/**
 * An {@link AuthProvider} for SAML.
 *
 * @public
 */
export class SAMLAuthProvider extends FederatedAuthProvider {
  /**
   * Constructor. The providerId must start with "saml."
   * @param providerId - SAML provider ID.
   */
  constructor(providerId: string) {
    _assert(
      providerId.startsWith(SAML_PROVIDER_PREFIX),
      AuthErrorCode.ARGUMENT_ERROR
    );
    super(providerId);
  }

  /**
   * Generates an {@link AuthCredential} from a {@link UserCredential} after a
   * successful SAML flow completes.
   *
   * @remarks
   *
   * For example, to get an {@link AuthCredential}, you could write the
   * following code:
   *
   * ```js
   * const userCredential = await signInWithPopup(auth, samlProvider);
   * const credential = SAMLAuthProvider.credentialFromResult(userCredential);
   * ```
   *
   * @param userCredential - The user credential.
   */
  static credentialFromResult(
    userCredential: UserCredential
  ): AuthCredential | null {
    return SAMLAuthProvider.samlCredentialFromTaggedObject(
      userCredential as UserCredentialInternal
    );
  }

  /**
   * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
   * thrown during a sign-in, link, or reauthenticate operation.
   *
   * @param userCredential - The user credential.
   */
  static credentialFromError(error: FirebaseError): AuthCredential | null {
    return SAMLAuthProvider.samlCredentialFromTaggedObject(
      (error.customData || {}) as TaggedWithTokenResponse
    );
  }

  /**
   * Creates an {@link AuthCredential} from a JSON string or a plain object.
   * @param json - A plain object or a JSON string
   */
  static credentialFromJSON(json: string | object): AuthCredential {
    const credential = SAMLAuthCredential.fromJSON(json);
    _assert(credential, AuthErrorCode.ARGUMENT_ERROR);
    return credential;
  }

  private static samlCredentialFromTaggedObject({
    _tokenResponse: tokenResponse
  }: TaggedWithTokenResponse): SAMLAuthCredential | null {
    if (!tokenResponse) {
      return null;
    }

    const { pendingToken, providerId } = tokenResponse as SignInWithIdpResponse;

    if (!pendingToken || !providerId) {
      return null;
    }

    try {
      return SAMLAuthCredential._create(providerId, pendingToken);
    } catch (e) {
      return null;
    }
  }
}

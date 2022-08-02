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

import * as exp from '@firebase/auth/internal';
import * as compat from '@firebase/auth-types';
import { FirebaseError } from '@firebase/util';
import { Auth } from './auth';
import { User } from './user';
import { unwrap, wrapped } from './wrap';

function credentialFromResponse(
  userCredential: exp.UserCredentialInternal
): exp.AuthCredential | null {
  return credentialFromObject(userCredential);
}

function attachExtraErrorFields(auth: exp.Auth, e: FirebaseError): void {
  // The response contains all fields from the server which may or may not
  // actually match the underlying type
  const response = (e.customData as exp.TaggedWithTokenResponse | undefined)
    ?._tokenResponse as unknown as Record<string, string>;
  if ((e as FirebaseError)?.code === 'auth/multi-factor-auth-required') {
    const mfaErr = e as compat.MultiFactorError;
    mfaErr.resolver = new MultiFactorResolver(
      auth,
      exp.getMultiFactorResolver(auth, e as exp.MultiFactorError)
    );
  } else if (response) {
    const credential = credentialFromObject(e);
    const credErr = e as compat.AuthError;
    if (credential) {
      credErr.credential = credential;
      credErr.tenantId = response.tenantId || undefined;
      credErr.email = response.email || undefined;
      credErr.phoneNumber = response.phoneNumber || undefined;
    }
  }
}

function credentialFromObject(
  object: FirebaseError | exp.UserCredential
): exp.AuthCredential | null {
  const { _tokenResponse } = (
    object instanceof FirebaseError ? object.customData : object
  ) as exp.TaggedWithTokenResponse;
  if (!_tokenResponse) {
    return null;
  }

  // Handle phone Auth credential responses, as they have a different format
  // from other backend responses (i.e. no providerId). This is also only the
  // case for user credentials (does not work for errors).
  if (!(object instanceof FirebaseError)) {
    if ('temporaryProof' in _tokenResponse && 'phoneNumber' in _tokenResponse) {
      return exp.PhoneAuthProvider.credentialFromResult(object);
    }
  }

  const providerId = _tokenResponse.providerId;

  // Email and password is not supported as there is no situation where the
  // server would return the password to the client.
  if (!providerId || providerId === exp.ProviderId.PASSWORD) {
    return null;
  }

  let provider: Pick<
    typeof exp.OAuthProvider,
    'credentialFromResult' | 'credentialFromError'
  >;
  switch (providerId) {
    case exp.ProviderId.GOOGLE:
      provider = exp.GoogleAuthProvider;
      break;
    case exp.ProviderId.FACEBOOK:
      provider = exp.FacebookAuthProvider;
      break;
    case exp.ProviderId.GITHUB:
      provider = exp.GithubAuthProvider;
      break;
    case exp.ProviderId.TWITTER:
      provider = exp.TwitterAuthProvider;
      break;
    default:
      const {
        oauthIdToken,
        oauthAccessToken,
        oauthTokenSecret,
        pendingToken,
        nonce
      } = _tokenResponse as exp.SignInWithIdpResponse;
      if (
        !oauthAccessToken &&
        !oauthTokenSecret &&
        !oauthIdToken &&
        !pendingToken
      ) {
        return null;
      }
      // TODO(avolkovi): uncomment this and get it working with SAML & OIDC
      if (pendingToken) {
        if (providerId.startsWith('saml.')) {
          return exp.SAMLAuthCredential._create(providerId, pendingToken);
        } else {
          // OIDC and non-default providers excluding Twitter.
          return exp.OAuthCredential._fromParams({
            providerId,
            signInMethod: providerId,
            pendingToken,
            idToken: oauthIdToken,
            accessToken: oauthAccessToken
          });
        }
      }
      return new exp.OAuthProvider(providerId).credential({
        idToken: oauthIdToken,
        accessToken: oauthAccessToken,
        rawNonce: nonce
      });
  }

  return object instanceof FirebaseError
    ? provider.credentialFromError(object)
    : provider.credentialFromResult(object);
}

export function convertCredential(
  auth: exp.Auth,
  credentialPromise: Promise<exp.UserCredential>
): Promise<compat.UserCredential> {
  return credentialPromise
    .catch(e => {
      if (e instanceof FirebaseError) {
        attachExtraErrorFields(auth, e);
      }
      throw e;
    })
    .then(credential => {
      const operationType = credential.operationType;
      const user = credential.user;

      return {
        operationType,
        credential: credentialFromResponse(
          credential as exp.UserCredentialInternal
        ),
        additionalUserInfo: exp.getAdditionalUserInfo(
          credential as exp.UserCredential
        ),
        user: User.getOrCreate(user)
      };
    });
}

export async function convertConfirmationResult(
  auth: exp.Auth,
  confirmationResultPromise: Promise<exp.ConfirmationResult>
): Promise<compat.ConfirmationResult> {
  const confirmationResultExp = await confirmationResultPromise;
  return {
    verificationId: confirmationResultExp.verificationId,
    confirm: (verificationCode: string) =>
      convertCredential(auth, confirmationResultExp.confirm(verificationCode))
  };
}

class MultiFactorResolver implements compat.MultiFactorResolver {
  readonly auth: Auth;
  constructor(
    auth: exp.Auth,
    private readonly resolver: exp.MultiFactorResolver
  ) {
    this.auth = wrapped(auth);
  }

  get session(): compat.MultiFactorSession {
    return this.resolver.session;
  }

  get hints(): compat.MultiFactorInfo[] {
    return this.resolver.hints;
  }

  resolveSignIn(
    assertion: compat.MultiFactorAssertion
  ): Promise<compat.UserCredential> {
    return convertCredential(
      unwrap(this.auth),
      this.resolver.resolveSignIn(assertion as exp.MultiFactorAssertion)
    );
  }
}

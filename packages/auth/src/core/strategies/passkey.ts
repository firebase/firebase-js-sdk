/**
 * @license
 * Copyright 2023 Google LLC
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

import { Auth, User, UserCredential } from '../../model/public_types';

import {
  startPasskeyEnrollment,
  StartPasskeyEnrollmentRequest,
  StartPasskeyEnrollmentResponse,
  finalizePasskeyEnrollment,
  FinalizePasskeyEnrollmentRequest,
  FinalizePasskeyEnrollmentResponse,
  startPasskeySignIn,
  StartPasskeySignInRequest,
  StartPasskeySignInResponse,
  finalizePasskeySignIn,
  FinalizePasskeySignInRequest,
  FinalizePasskeySignInResponse,
  publicKeyCredentialToJSON
} from '../../api/account_management/passkey';
import { UserInternal } from '../../model/user';
import { _castAuth } from '../auth/auth_impl';
import { getModularInstance } from '@firebase/util';
import { OperationType } from '../../model/enums';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { signInAnonymously } from './anonymous';

const DEFAULT_PASSKEY_ACCOUNT_NAME = 'Unnamed account (Web)';
const PASSKEY_LOOK_UP_ERROR_MESSAGE =
  'The operation either timed out or was not allowed.';

/**
 * Signs in a user with a passkey.
 * @param auth - The Firebase Auth instance.
 * @param name - The user's name for passkey.
 * @param manualSignUp - When false, automatically creates an anonymous user if a user does not exist. Defaults to false.
 * @returns A promise that resolves with a `UserCredential` object.
 */
export async function signInWithPasskey(
  auth: Auth,
  name: string,
  manualSignUp: boolean = false
): Promise<UserCredential> {
  const authInternal = _castAuth(auth);

  // Start Passkey Sign in
  const startSignInRequest: StartPasskeySignInRequest = {};
  const startSignInResponse = await startPasskeySignIn(
    authInternal,
    startSignInRequest
  );

  const options = getPasskeyCredentialRequestOptions(startSignInResponse, name);

  // Get the credential
  let credential;
  try {
    credential = (await navigator.credentials.get({
      publicKey: options
    })) as PublicKeyCredential;

    const finalizeSignInRequest: FinalizePasskeySignInRequest = {
      authenticatorAuthenticationResponse:
        publicKeyCredentialToJSON(credential),
      name,
      displayName: name
    };
    const finalizeSignInResponse: FinalizePasskeySignInResponse =
      await finalizePasskeySignIn(authInternal, finalizeSignInRequest);

    const operationType = OperationType.SIGN_IN;
    const userCredential = await UserCredentialImpl._fromIdTokenResponse(
      authInternal,
      operationType,
      finalizeSignInResponse
    );
    await auth.updateCurrentUser(userCredential.user);
    return userCredential;
  } catch (error) {
    if (
      (error as Error).message.includes(PASSKEY_LOOK_UP_ERROR_MESSAGE) &&
      !manualSignUp
    ) {
      // If the user is not signed up, sign them up anonymously
      const userCredential = await signInAnonymously(authInternal);
      const user = userCredential.user;
      return enrollPasskey(user, name);
    }
    return Promise.reject(error);
  }
}

/**
 * Enrolls a passkey for the user account.
 * @param user - The user to enroll the passkey for.
 * @param name - The name associated with the passkey.
 * @returns A promise that resolves with a `UserCredential` object.
 * @public
 */
export async function enrollPasskey(
  user: User,
  name: string
): Promise<UserCredential> {
  const userInternal = getModularInstance(user) as UserInternal;
  const authInternal = _castAuth(userInternal.auth);

  if (name === '') {
    name = DEFAULT_PASSKEY_ACCOUNT_NAME;
  }

  // Start Passkey Enrollment
  const idToken = await userInternal.getIdToken();
  const startEnrollmentRequest: StartPasskeyEnrollmentRequest = {
    idToken
  };
  const startEnrollmentResponse = await startPasskeyEnrollment(
    authInternal,
    startEnrollmentRequest
  );

  // Create the crendential
  try {
    const options = getPasskeyCredentialCreationOptions(
      startEnrollmentResponse,
      name
    );
    const credential = (await navigator.credentials.create({
      publicKey: options
    })) as PublicKeyCredential;
    const idToken = await userInternal.getIdToken();
    const finalizeEnrollmentRequest: FinalizePasskeyEnrollmentRequest = {
      idToken,
      authenticatorRegistrationResponse: publicKeyCredentialToJSON(credential),
      name,
      displayName: name
    };
    const finalizeEnrollmentResponse: FinalizePasskeyEnrollmentResponse =
      await finalizePasskeyEnrollment(authInternal, finalizeEnrollmentRequest);

    // The passkey provider is linked with the user's current providers.
    const operationType = OperationType.LINK;
    const userCredential = await UserCredentialImpl._fromIdTokenResponse(
      userInternal.auth,
      operationType,
      finalizeEnrollmentResponse
    );
    return userCredential;
  } catch (err) {
    return Promise.reject(err);
  }
}

// Converts an array of credential IDs of `excludeCredentials` field to an array of `PublicKeyCredentialDescriptor` objects.
function convertExcludeCredentials(
  options:
    | PublicKeyCredentialCreationOptions
    | PublicKeyCredentialRequestOptions
): void {
  function base64ToBuffer(base64: string): ArrayBuffer {
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
  }

  if ('excludeCredentials' in options && options.excludeCredentials) {
    for (const cred of options.excludeCredentials) {
      if (typeof cred.id === 'string') {
        // Assuming Base64 encoded strings
        cred.id = base64ToBuffer(cred.id);
      }
    }
  }
}

function getPasskeyCredentialCreationOptions(
  response: StartPasskeyEnrollmentResponse,
  name: string = ''
): PublicKeyCredentialCreationOptions {
  const options = response.credentialCreationOptions!;

  if (name === '') {
    name = 'Unnamed account (Web)';
  }

  options.user!.name = name;
  options.user!.displayName = name;

  const userId = options.user!.id as unknown as string;
  options.user!.id = Uint8Array.from(atob(userId), c => c.charCodeAt(0));

  const rpId = window.location.hostname;
  options.rp!.id = rpId;
  options.rp!.name = rpId;

  const challengeBase64 = options.challenge as unknown as string;
  options.challenge = Uint8Array.from(atob(challengeBase64), c =>
    c.charCodeAt(0)
  );

  convertExcludeCredentials(options);

  return options;
}

function getPasskeyCredentialRequestOptions(
  response: StartPasskeySignInResponse,
  name: string = ''
): PublicKeyCredentialRequestOptions {
  const options = response.credentialRequestOptions!;

  if (name === '') {
    name = 'Unnamed account (Web)';
  }

  const rpId = window.location.hostname;
  options.rpId = rpId;

  const challengeBase64 = options.challenge as unknown as string;
  options.challenge = Uint8Array.from(atob(challengeBase64), c =>
    c.charCodeAt(0)
  );

  convertExcludeCredentials(options);

  return options;
}

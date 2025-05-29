/**
 * @license
 * Copyright 2021 Google LLC
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

import { AuthErrorCode } from '../core/errors';
import { _createError } from '../core/util/assert';

import { FirebaseApp, getApp, _getProvider } from '@firebase/app';
import { Auth } from '../model/public_types';

import { initializeAuth, inMemoryPersistence, connectAuthEmulator } from '..';
import { registerAuth } from '../core/auth/register';
import { ClientPlatform } from '../core/util/version';
import { AuthImpl } from '../core/auth/auth_impl';

import { FetchProvider } from '../core/util/fetch_provider';
import { getDefaultEmulatorHost } from '@firebase/util';

// Initialize the fetch polyfill, the types are slightly off so just cast and hope for the best
FetchProvider.initialize(fetch, Headers, Response);

// First, we set up the various platform-specific features for Node (register
// the version and declare the Node getAuth function)

export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  const auth = initializeAuth(app);

  const authEmulatorHost = getDefaultEmulatorHost('auth');
  if (authEmulatorHost) {
    connectAuthEmulator(auth, `http://${authEmulatorHost}`);
  }

  return auth;
}

registerAuth(ClientPlatform.NODE);

// The rest of this file contains no-ops and errors for browser-specific
// methods. We keep the browser and Node entry points the same, but features
// that only work in browsers are set to either do nothing (setPersistence) or
// to reject with an auth/operation-not-supported-in-this-environment error.
// The below exports are pulled into the main entry point by a rollup alias
// plugin (overwriting the default browser imports).

/** auth/operation-not-supported-in-this-environment */
const NOT_AVAILABLE_ERROR = _createError(AuthErrorCode.OPERATION_NOT_SUPPORTED);

/** Reject with auth/operation-not-supported-in-this-environment */
async function fail(): Promise<void> {
  throw NOT_AVAILABLE_ERROR;
}

/**
 * A class which will throw with
 * auth/operation-not-supported-in-this-environment if instantiated
 */
class FailClass {
  constructor() {
    throw NOT_AVAILABLE_ERROR;
  }
}

export const browserLocalPersistence = inMemoryPersistence;
export const browserSessionPersistence = inMemoryPersistence;
export const browserCookiePersistence = inMemoryPersistence;
export const indexedDBLocalPersistence = inMemoryPersistence;
export const browserPopupRedirectResolver = NOT_AVAILABLE_ERROR;
export const PhoneAuthProvider = FailClass;
export const signInWithPhoneNumber = fail;
export const linkWithPhoneNumber = fail;
export const reauthenticateWithPhoneNumber = fail;
export const updatePhoneNumber = fail;
export const signInWithPopup = fail;
export const linkWithPopup = fail;
export const reauthenticateWithPopup = fail;
export const signInWithRedirect = fail;
export const linkWithRedirect = fail;
export const reauthenticateWithRedirect = fail;
export const getRedirectResult = fail;
export const RecaptchaVerifier = FailClass;
export const initializeRecaptchaConfig = fail;
export class PhoneMultiFactorGenerator {
  static assertion(): unknown {
    throw NOT_AVAILABLE_ERROR;
  }
}

// Set persistence should no-op instead of fail. Changing the prototype will
// make sure both setPersistence(auth, persistence) and
// auth.setPersistence(persistence) are covered.
AuthImpl.prototype.setPersistence = async (): Promise<void> => {};

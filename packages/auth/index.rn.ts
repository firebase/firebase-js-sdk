/**
 * @license
 * Copyright 2017 Google LLC
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
 * This is the file that people using React Native will actually import. You
 * should only include this file if you have something specific about your
 * implementation that mandates having a separate entrypoint. Otherwise you can
 * just use index.ts
 */

import { FirebaseApp, getApp, _getProvider } from '@firebase/app';
import { Auth, Dependencies } from './src/model/public_types';

import { initializeAuth as initializeAuthOriginal } from './src';
import { registerAuth } from './src/core/auth/register';
import { ClientPlatform } from './src/core/util/version';
import { _logWarn } from './src/core/util/log';

// Core functionality shared by all clients
export * from './index.shared';

// Export some Phone symbols
// providers
export { PhoneAuthProvider } from './src/platform_browser/providers/phone';

// strategies
export {
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  updatePhoneNumber
} from './src/platform_browser/strategies/phone';

// MFA
export { PhoneMultiFactorGenerator } from './src/platform_browser/mfa/assertions/phone';
export {
  TotpMultiFactorGenerator,
  TotpSecret
} from './src/mfa/assertions/totp';

export { getReactNativePersistence } from './src/platform_react_native/persistence/react_native';

const NO_PERSISTENCE_WARNING = `
You are initializing Firebase Auth for React Native without providing
AsyncStorage. Auth state will default to memory persistence and will not
persist between sessions. In order to persist auth state, install the package
"@react-native-async-storage/async-storage" and provide it to
initializeAuth:

import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
`;

export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  // Only warn if getAuth() is called before initializeAuth()
  _logWarn('getAuth() has been called before initializeAuth(). Make sure to call initializeAuth() first.');

  return initializeAuthOriginal(app);
}

/**
 * Wrapper around base `initializeAuth()` for RN users only, which
 * shows the warning message if no persistence is provided.
 * Double-checked potential collision with `export * from './index.shared'`
 * as `./index.shared` also exports `initializeAuth()`, and the final
 * bundle does correctly export only this `initializeAuth()` function
 * and not the one from index.shared.
 */
export function initializeAuth(app: FirebaseApp, deps?: Dependencies): Auth {
  if (!deps?.persistence) {
    _logWarn(NO_PERSISTENCE_WARNING);
  }
  return initializeAuthOriginal(app, deps);
}

registerAuth(ClientPlatform.REACT_NATIVE);

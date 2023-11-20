/*
 *
 * Firebase Authentication
 *
 * @packageDocumentation
 */

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

// Public types
export * from './src/model/public_types';

// Helper maps (not used internally)
export {
  FactorId,
  ProviderId,
  SignInMethod,
  OperationType,
  ActionCodeOperation
} from './src/model/enum_maps';

// Core functionality shared by all clients
export * from './src';

// Additional DOM dependend functionality; we need to import and then
// export separately so that the rollup alias will work (for aliasing these
// imports in node environments to no-ops and errors... see
// src/platform_node/index.ts).

// persistence
import { browserLocalPersistence } from './src/platform_browser/persistence/local_storage';
import { browserSessionPersistence } from './src/platform_browser/persistence/session_storage';
import { indexedDBLocalPersistence } from './src/platform_browser/persistence/indexed_db';

// providers
import { PhoneAuthProvider } from './src/platform_browser/providers/phone';

// strategies
import {
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  updatePhoneNumber
} from './src/platform_browser/strategies/phone';
import {
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup
} from './src/platform_browser/strategies/popup';
import {
  signInWithRedirect,
  linkWithRedirect,
  reauthenticateWithRedirect,
  getRedirectResult
} from './src/platform_browser/strategies/redirect';

import { RecaptchaVerifier } from './src/platform_browser/recaptcha/recaptcha_verifier';
import { browserPopupRedirectResolver } from './src/platform_browser/popup_redirect';

// MFA
import { PhoneMultiFactorGenerator } from './src/platform_browser/mfa/assertions/phone';
import {
  TotpMultiFactorGenerator,
  TotpSecret
} from './src/mfa/assertions/totp';

// Initialization and registration of Auth
import { getAuth } from './src/platform_browser';

export {
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  updatePhoneNumber,
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithRedirect,
  linkWithRedirect,
  reauthenticateWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  browserPopupRedirectResolver,
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  TotpSecret,
  getAuth
};

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

import * as externs from '@firebase/auth-types-exp';
import { CompleteFn, ErrorFn, Unsubscribe } from '@firebase/util';

// Core functionality shared by all browser based clients
export * from './index.webworker';

// Additional DOM dependend functionality 

// core/persistence
export {
  browserLocalPersistence,
  browserSessionPersistence
} from './src/core/persistence/browser';
export { indexedDBLocalPersistence } from './src/core/persistence/indexed_db';
export { getReactNativePersistence } from './src/core/persistence/react_native';

// core/strategies
export {
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber
} from './src/core/strategies/phone';
export {
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup
} from './src/core/strategies/popup';

// platform_browser
export { RecaptchaVerifier } from './src/platform_browser/recaptcha/recaptcha_verifier';
export { browserPopupRedirectResolver } from './src/platform_browser/popup_redirect';

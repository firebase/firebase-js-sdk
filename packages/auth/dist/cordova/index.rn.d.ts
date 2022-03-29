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
import { FirebaseApp } from '@firebase/app';
import { Auth, Persistence } from './src/model/public_types';
import { getReactNativePersistence } from './src/platform_react_native/persistence/react_native';
export * from './index.shared';
export { PhoneAuthProvider } from './src/platform_browser/providers/phone';
export { signInWithPhoneNumber, linkWithPhoneNumber, reauthenticateWithPhoneNumber, updatePhoneNumber } from './src/platform_browser/strategies/phone';
export { PhoneMultiFactorGenerator } from './src/platform_browser/mfa/assertions/phone';
/**
 * An implementation of {@link Persistence} of type 'LOCAL' for use in React
 * Native environments.
 *
 * @public
 */
export declare const reactNativeLocalPersistence: Persistence;
export { getReactNativePersistence };
export declare function getAuth(app?: FirebaseApp): Auth;

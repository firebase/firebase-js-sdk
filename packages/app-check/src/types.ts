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

import { FirebaseApp } from '@firebase/app';
import { PartialObserver } from '@firebase/util';
import { AppCheckToken, AppCheckTokenListener } from './public-types';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';

export interface AppCheckTokenObserver
  extends PartialObserver<AppCheckTokenResult> {
  // required
  next: AppCheckTokenListener;
  type: ListenerType;
}

export const enum ListenerType {
  // Listener added by a 2P library.
  'INTERNAL' = 'INTERNAL',
  // Listener added by users using the public API.
  'EXTERNAL' = 'EXTERNAL'
}

// If the error field is defined, the token field will be populated with a dummy token
export interface AppCheckTokenResult {
  readonly token: string;
  readonly error?: Error;
  // Error that should not be propagated to 3P listeners, e.g. exchange
  // request errors during proactive refresh period, while the token
  // is still valid.
  readonly internalError?: Error;
}

export interface AppCheckTokenInternal extends AppCheckToken {
  issuedAtTimeMillis: number;
}

export interface AppCheckProvider {
  /**
   * Returns an App Check token.
   * @internal
   */
  getToken: (isLimitedUse?: boolean) => Promise<AppCheckTokenInternal>;
  /**
   * @internal
   */
  initialize(app: FirebaseApp): void;
}

/**
 * @internal
 */
export type _AppCheckInternalComponentName = 'app-check-internal';

export interface ThrottleData {
  allowRequestsAfter: number;
  backoffCount: number;
  httpStatus: number;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-check-internal': FirebaseAppCheckInternal;
  }
}

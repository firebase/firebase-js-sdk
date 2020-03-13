/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Auth } from '../../src';
import { AuthEventType, AuthEvent } from './auth_event';
import { UserCredential } from './user_credential';
import { AuthProvider } from '../core/providers';

export interface EventSubscriber {
  onEvent(event: AuthEvent): Promise<boolean>;
}

export interface PopupRedirectResolver {
  processPopup(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<UserCredential>;
  processRedirect(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<never>;
  // getRedirectResult(auth: Auth): Promise<UserCredential | null>;
  initializeAndWait(auth: Auth): Promise<void>;

  isInitialized(): boolean;
}

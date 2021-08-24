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

import {
  Auth,
  AuthProvider,
  PopupRedirectResolver,
  User
} from '../../model/public_types';
import {
  _linkWithRedirect,
  _reauthenticateWithRedirect,
  _signInWithRedirect
} from '../../platform_browser/strategies/redirect';

export function signInWithRedirect(
  auth: Auth,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<void> {
  return _signInWithRedirect(auth, provider, resolver) as Promise<void>;
}

export function reauthenticateWithRedirect(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<void> {
  return _reauthenticateWithRedirect(user, provider, resolver) as Promise<void>;
}

export function linkWithRedirect(
  user: User,
  provider: AuthProvider,
  resolver?: PopupRedirectResolver
): Promise<void> {
  return _linkWithRedirect(user, provider, resolver) as Promise<void>;
}

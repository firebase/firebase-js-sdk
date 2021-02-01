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

import * as externs from '@firebase/auth-types-exp';
import { _castAuth } from '../../core/auth/auth_impl';
import { AuthErrorCode } from '../../core/errors';
import { OAuthProvider } from '../../core/providers/oauth';
import { _assert } from '../../core/util/assert';
import { _withDefaultResolver } from '../../core/util/resolver';
import { AuthEventType } from '../../model/popup_redirect';

// TODO: For now this code is largely a duplicate of platform_browser/strategies/redirect.
//       It's likely we can just reuse that code

export async function signInWithRedirect(
  auth: externs.Auth,
  provider: externs.AuthProvider,
  resolver?: externs.PopupRedirectResolver
): Promise<never> {
  const authInternal = _castAuth(auth);
  _assert(
    provider instanceof OAuthProvider,
    auth,
    AuthErrorCode.ARGUMENT_ERROR
  );

  return _withDefaultResolver(authInternal, resolver)._openRedirect(
    authInternal,
    provider,
    AuthEventType.SIGN_IN_VIA_REDIRECT
  );
}

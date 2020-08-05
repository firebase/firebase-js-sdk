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

export * from '../index';

import { assert } from '../src/core/util/assert';

export { SignInWithIdpResponse } from '../src/api/authentication/idp';
export { AuthErrorCode } from '../src/core/errors';
export { Persistence } from '../src/core/persistence';
export { UserImpl } from '../src/core/user/user_impl';
export { _getInstance } from '../src/core/util/instantiator';
export { UserCredential, UserParameters } from '../src/model/user';
export {
  AuthImplCompat,
  DEFAULT_API_HOST,
  DEFAULT_API_SCHEME,
  DEFAULT_TOKEN_API_HOST
} from '../src/core/auth/auth_impl';

export { ClientPlatform, _getClientVersion } from '../src/core/util/version';

export { fail } from '../src/core/util/assert';
export const assertFn: typeof assert = assert;

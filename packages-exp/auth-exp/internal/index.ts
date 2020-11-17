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
 * This interface is intended only for use by @firebase/auth-compat-exp, do not use directly
 */
export * from '../index';

export { SignInWithIdpResponse } from '../src/api/authentication/idp';
export { AuthErrorCode } from '../src/core/errors';
export { Persistence } from '../src/core/persistence';
export { _persistenceKeyName } from '../src/core/persistence/persistence_user_manager';
export { UserImpl } from '../src/core/user/user_impl';
export { _getInstance } from '../src/core/util/instantiator';
export { UserCredential, UserParameters } from '../src/model/user';
export { registerAuth } from '../src/core/auth/register';
export { DefaultConfig, AuthImpl } from '../src/core/auth/auth_impl';

export { ClientPlatform, _getClientVersion } from '../src/core/util/version';

export { _generateEventId } from '../src/core/util/event_id';

export { _fail, _assert } from '../src/core/util/assert';

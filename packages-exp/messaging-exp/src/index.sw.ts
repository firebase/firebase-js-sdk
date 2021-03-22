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

import '@firebase/installations-exp';

import { ERROR_FACTORY, ErrorCode } from './util/errors';

import { FirebaseMessaging } from './interfaces/public-types';
import { isSwSupported } from './api/isSupported';
import { registerMessaging } from './helpers/register';

export { onBackgroundMessage, getMessaging } from './api';
export { isSwSupported as isSupported } from './api/isSupported';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'messaging-exp': FirebaseMessaging;
  }
}

// Top-level 'await' requires the 'module' option is set to 'esnext' or 'system', and the 'target'
// option is set to 'es2017' or higher. Therefor use non-anonymous async function here.
void (async () => {
  if (!(await isSwSupported())) {
    throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
  }
})();

registerMessaging();

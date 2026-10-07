/**
 * @license
 * Copyright 2026 Google LLC
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

import createBaseConfig from '../../config/vitest.base.mjs';
import { AuthErrorCodes } from '@firebase/auth';

const AuthErrorCode = Object.fromEntries(
  Object.entries(AuthErrorCodes).map(([k, v]) => [k, v.replace(/^auth\//, '')])
);

const AuthEventType = {
  LINK_VIA_POPUP: 'linkViaPopup',
  LINK_VIA_REDIRECT: 'linkViaRedirect',
  REAUTH_VIA_POPUP: 'reauthViaPopup',
  REAUTH_VIA_REDIRECT: 'reauthViaRedirect',
  SIGN_IN_VIA_POPUP: 'signInViaPopup',
  SIGN_IN_VIA_REDIRECT: 'signInViaRedirect',
  UNKNOWN: 'unknown',
  VERIFY_APP: 'verifyApp'
};

function authInternalPlugin() {
  return {
    name: 'auth-internal-const-enums',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (
        /[/\\](?:@firebase[/\\]auth|packages[/\\]auth)[/\\]/.test(cleanId) &&
        /[/\\]internal(?:\.js|[/\\]index\.[jt]s)?$/.test(cleanId)
      ) {
        return {
          code:
            code +
            `\nexport const AuthErrorCode = ${JSON.stringify(AuthErrorCode)};\nexport const AuthEventType = ${JSON.stringify(AuthEventType)};\n`,
          map: null
        };
      }
    }
  };
}

const config = createBaseConfig(import.meta.url);

// Auth-compat unit tests are browser-only; filter test projects to browser runner
if (config.test?.projects) {
  config.test.projects = config.test.projects.filter(
    project => project.test?.name === 'browser'
  );

  for (const project of config.test.projects) {
    project.plugins = [...(project.plugins || []), authInternalPlugin()];
    project.test.exclude = [
      ...(project.test.exclude || []),
      'test/integration/**'
    ];
  }
}

export default config;

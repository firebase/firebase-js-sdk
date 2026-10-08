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
import { fileURLToPath } from 'url';

const projectJsonPath = fileURLToPath(
  new URL('../../config/project.json', import.meta.url)
);

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
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (cleanId.endsWith('.ts') && code.includes('config/project.json')) {
        return {
          code: code.replace(
            /const (\w+) = require\([^)]*config\/project\.json[^)]*\);/g,
            `import $1 from ${JSON.stringify(projectJsonPath)};`
          ),
          map: null
        };
      }
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
if (config.test) {
  config.test.passWithNoTests = true;
}

const hasEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const hasExplicitSuiteArg = process.argv.some(arg =>
  arg.includes('test/integration')
);

if (config.test?.projects) {
  for (const project of config.test.projects) {
    project.plugins = [...(project.plugins || []), authInternalPlugin()];
    project.define = {
      ...(project.define || {}),
      'process.env.FIREBASE_AUTH_EMULATOR_HOST': JSON.stringify(
        process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
      ),
      'process.env.GCLOUD_PROJECT': JSON.stringify(
        process.env.GCLOUD_PROJECT || 'demo-emulatedproject'
      )
    };
    if (project.test) {
      project.test.fileParallelism = false;
      project.test.testTimeout = 20000;
      project.test.hookTimeout = 20000;

      if (project.test.name === 'browser' && project.test.browser) {
        project.test.browser.instances = [
          {
            browser:
              process.env.BROWSERS === 'WebkitHeadless'
                ? 'webkit'
                : process.env.BROWSERS === 'Firefox'
                  ? 'firefox'
                  : 'chromium'
          }
        ];
        project.test.browser.screenshotFailures = false;
      }

      if (project.test.name === 'node') {
        // Unit tests in src/ are browser-only; only run integration tests in Node
        project.test.include = ['test/integration/flows/**/*.test.ts'];
        project.test.passWithNoTests = true;
      }

      if (!hasEmulator && !hasExplicitSuiteArg) {
        project.test.exclude = [
          ...(project.test.exclude || []),
          'test/integration/**'
        ];
      }
    }
  }
}

export default config;

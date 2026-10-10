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

import fs from 'fs';
import path from 'path';
import createBaseConfig from '../../config/vitest.base.mjs';

// Ensure `./packages/auth/coverage/lcov.info` exists for the `test-auth` coverage merge step in `.github/workflows/test-all.yml`.
const coverageDir = path.resolve(import.meta.dirname, 'coverage');
fs.mkdirSync(coverageDir, { recursive: true });
const lcovPath = path.resolve(coverageDir, 'lcov.info');
if (!fs.existsSync(lcovPath)) {
  fs.writeFileSync(lcovPath, '');
}

const config = createBaseConfig(import.meta.url);

config.test.teardownTimeout = 1000;

const hasIntegrationArg = process.argv.some(arg =>
  arg.includes('test/integration')
);
const hasWebdriverArg = process.argv.some(arg =>
  arg.includes('test/integration/webdriver')
);

function projectConfigPlugin() {
  return {
    name: 'auth-project-config',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (
        cleanId.endsWith('.ts') &&
        code.includes("require('../../../../../config/project.json')")
      ) {
        return {
          code: code.replace(
            /const (\w+) = require\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/config\/project\.json'\);/g,
            "import $1 from '../../../../../config/project.json';"
          ),
          map: null
        };
      }
      return null;
    }
  };
}

for (const project of config.test.projects) {
  const exclude = [
    ...(project.test.exclude || []),
    '**/platform_react_native/**'
  ];
  if (!hasIntegrationArg) {
    exclude.push('test/integration/**');
  } else {
    if (!hasWebdriverArg) {
      exclude.push('test/integration/webdriver/**');
    } else if (!process.env.COMPAT_LAYER) {
      exclude.push('test/integration/webdriver/compat/**');
    }
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      exclude.push('**/*.local.test.ts');
    }
    project.test.fileParallelism = false;
    project.test.testTimeout = 20000;
  }

  if (project.test.name === 'node') {
    exclude.push('**/platform_browser/**', '**/platform_cordova/**');
    project.test.exclude = exclude;
  } else if (project.test.name === 'browser') {
    project.test.exclude = exclude;
    if (project.test.browser) {
      project.test.browser.screenshotFailures = false;
    }
    project.define = {
      ...(project.define || {}),
      'process.env': JSON.stringify({
        FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT
      })
    };
    project.optimizeDeps = {
      ...(project.optimizeDeps || {}),
      include: [...(project.optimizeDeps?.include || []), 'totp-generator']
    };
    project.plugins = [...(project.plugins || []), projectConfigPlugin()];
  }
}

export default config;

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

import path from 'path';
import { fileURLToPath } from 'url';
import createBaseConfig from '../../config/vitest.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetBackendArg =
  process.argv.find(arg => arg.startsWith('--targetBackend='))?.split('=')[1] ||
  (process.argv.includes('--local')
    ? 'emulator'
    : process.env.FIRESTORE_TARGET_BACKEND);

const config = createBaseConfig(import.meta.url);

config.test.projects = config.test.projects.map(project => {
  const isBrowser = project.test?.name === 'browser';
  return {
    ...project,
    define: {
      ...(project.define || {}),
      ...(isBrowser
        ? {
            'process.env': JSON.stringify({
              ...(project.define?.['process.env']
                ? typeof project.define['process.env'] === 'string'
                  ? JSON.parse(project.define['process.env'])
                  : project.define['process.env']
                : {}),
              FIRESTORE_TARGET_BACKEND: targetBackendArg,
              FIRESTORE_EMULATOR_PORT: process.env.FIRESTORE_EMULATOR_PORT,
              FIRESTORE_EMULATOR_PROJECT_ID:
                process.env.FIRESTORE_EMULATOR_PROJECT_ID,
              FIRESTORE_PROJECT_ID: process.env.FIRESTORE_PROJECT_ID,
              GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
              INCLUDE_FIRESTORE_PERSISTENCE:
                process.env.INCLUDE_FIRESTORE_PERSISTENCE
            })
          }
        : {})
    },
    optimizeDeps: {
      ...(project.optimizeDeps || {}),
      include: [
        ...(project.optimizeDeps?.include || []),
        ...(isBrowser ? ['buffer', '@js-temporal/polyfill'] : [])
      ]
    },
    test: {
      ...project.test,
      setupFiles: [
        path.resolve(
          __dirname,
          isBrowser ? 'test/setup.browser.ts' : 'test/setup.node.ts'
        )
      ],
      fileParallelism: false,
      isolate: true,
      testTimeout: 20000,
      hookTimeout: 20000,
      retry: process.env.CI ? 3 : 0,
      ...(isBrowser
        ? {
            browser: {
              ...project.test.browser,
              instances: [
                {
                  browser:
                    process.env.BROWSERS === 'WebkitHeadless'
                      ? 'webkit'
                      : process.env.BROWSERS === 'Firefox'
                        ? 'firefox'
                        : 'chromium'
                }
              ],
              screenshotFailures: false
            }
          }
        : {})
    }
  };
});

export default config;

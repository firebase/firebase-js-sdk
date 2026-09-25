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
import { fileURLToPath } from 'url';
import ts from 'typescript';
import createBaseConfig from '../../config/vitest.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.CI) {
  const coverageDir = path.resolve(__dirname, 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  const lcovPath = path.resolve(coverageDir, 'lcov.info');
  if (!fs.existsSync(lcovPath)) {
    fs.writeFileSync(lcovPath, '');
  }
}

function stripTypeExportsPlugin() {
  let program;
  return {
    name: 'strip-type-exports',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (!cleanId.endsWith('.ts') || !code.includes('export {')) {
        return null;
      }
      if (!program) {
        const configPath = path.resolve(__dirname, 'tsconfig.json');
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          __dirname
        );
        program = ts.createProgram(parsedConfig.fileNames, {
          ...parsedConfig.options,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext,
          sourceMap: false,
          inlineSourceMap: false
        });
      }
      const sf = program.getSourceFile(cleanId);
      if (!sf) {
        return null;
      }
      let emittedCode = null;
      program.emit(sf, (fileName, data) => {
        if (fileName.endsWith('.js')) {
          emittedCode = data;
        }
      });
      if (emittedCode !== null) {
        return { code: emittedCode, map: null };
      }
      return null;
    }
  };
}

function platformBase64Plugin(isBrowser) {
  return {
    name: 'firestore-platform-base64',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (cleanId.endsWith('/src/platform/base64.ts')) {
        const target = isBrowser ? './browser/base64' : './node/base64';
        return {
          code: code.replace(
            /const platform = require\([^)]+\);/,
            `import * as platform from '${target}';`
          ),
          map: null
        };
      }
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

const config = createBaseConfig(import.meta.url);
config.test.onUnhandledError = error => {
  if (
    error?.message?.includes(
      'Invalid bundle format: Reached the end of bundle when a length string is expected.'
    )
  ) {
    return false;
  }
};

const isLite = (process.env.TEST_PLATFORM || '').endsWith('_lite');
const hasTargetBackend = Boolean(
  process.env.FIRESTORE_TARGET_BACKEND || process.env.FIRESTORE_EMULATOR_PORT
);
const hasExplicitSuiteArg = process.argv.some(
  arg => arg.includes('test/integration') || arg.includes('test/lite')
);

config.test.projects = config.test.projects.map(project => {
  const isBrowser = project.test?.name === 'browser';
  const platformDir = isLite ? `${project.test.name}_lite` : project.test.name;

  const setupFiles = [...(project.test.setupFiles || [])];
  if (!isBrowser && process.env.USE_MOCK_PERSISTENCE === 'YES') {
    setupFiles.unshift(
      path.resolve(__dirname, 'test/util/node_persistence.ts')
    );
  }

  const exclude = [...(project.test.exclude || [])];
  if (isLite) {
    exclude.push('test/unit/**', 'test/integration/**');
  } else {
    exclude.push('test/lite/**');
    if (!isBrowser) {
      exclude.push('test/integration/browser/**');
    }
    if (!hasTargetBackend && !hasExplicitSuiteArg) {
      exclude.push('test/integration/**');
    }
  }

  return {
    ...project,
    define: {
      ...(project.define || {}),
      ...(isBrowser
        ? {
            'process.env': JSON.stringify({
              FIRESTORE_TARGET_DB_ID: process.env.FIRESTORE_TARGET_DB_ID,
              RUN_ENTERPRISE_TESTS: process.env.RUN_ENTERPRISE_TESTS,
              FIRESTORE_TARGET_BACKEND: process.env.FIRESTORE_TARGET_BACKEND,
              FIRESTORE_EMULATOR_PORT: process.env.FIRESTORE_EMULATOR_PORT,
              FIRESTORE_EMULATOR_PROJECT_ID:
                process.env.FIRESTORE_EMULATOR_PROJECT_ID,
              FIRESTORE_PROJECT_ID: process.env.FIRESTORE_PROJECT_ID,
              GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
              TEST_PLATFORM: process.env.TEST_PLATFORM,
              USE_MOCK_PERSISTENCE: process.env.USE_MOCK_PERSISTENCE,
              FIRESTORE_RUN_LARGE_DOC_TESTS:
                process.env.FIRESTORE_RUN_LARGE_DOC_TESTS
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
    plugins: [
      ...(project.plugins || []),
      platformBase64Plugin(isBrowser),
      ...(isBrowser ? [stripTypeExportsPlugin()] : [])
    ],
    resolve: {
      ...project.resolve,
      alias: [
        ...(Array.isArray(project.resolve?.alias) ? project.resolve.alias : []),
        {
          find: /^(.*)\/platform\/(?!base64)([^.\/]*)(\.ts)?$/,
          replacement: `$1/platform/${platformDir}/$2.ts`
        }
      ]
    },
    test: {
      ...project.test,
      setupFiles,
      fileParallelism: false,
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
            },
            isolate: false
          }
        : {}),
      ...(isLite ? { include: ['test/lite/**/*.test.ts'] } : {}),
      exclude
    }
  };
});

export default config;

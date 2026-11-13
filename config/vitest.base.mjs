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

import '../scripts/ensure_playwright.js';
import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

function getConcurrency() {
  if (process.env.VITEST_MAX_FORKS) {
    return parseInt(process.env.VITEST_MAX_FORKS, 10);
  }
  const totalMemGB = os.totalmem() / (1024 * 1024 * 1024);
  const memoryCap = Math.floor(totalMemGB / 1.5);
  const cpuCap = process.env.CI ? 2 : Math.max(2, Math.floor(os.cpus().length / 2));
  return Math.max(1, Math.min(12, Math.min(cpuCap, memoryCap)));
}

const maxForks = getConcurrency();

/**
 * Wraps the Playwright browser provider so that when a session uses `vi.mock()`,
 * its `BrowserContext` registers a permanent no-op route on the first mock
 * registration. This keeps Playwright's request interception (`Fetch.enable`
 * and `Network.setCacheDisabled(true)`) active across `mocker.clear()` calls
 * between test files in that session, without enabling network interception
 * for suites that never call `vi.mock()` (such as `@firebase/firestore`
 * live backend integration tests).
 */
function createPlaywrightProvider(options) {
  const baseProvider = playwright(options);
  return {
    ...baseProvider,
    providerFactory(project) {
      const provider = baseProvider.providerFactory(project);
      if (provider.mocker) {
        const routedSessions = new Set();
        const register = provider.mocker.register.bind(provider.mocker);
        provider.mocker.register = async (sessionId, module) => {
          if (!routedSessions.has(sessionId)) {
            routedSessions.add(sessionId);
            await provider
              .getPage(sessionId)
              .context()
              .route(/^$/, route => route.continue());
          }
          return register(sessionId, module);
        };
      }
      return provider;
    }
  };
}

const PROJECT_DEFAULT_KEYS = new Set([
  'testTimeout',
  'hookTimeout',
  'retry',
  'fileParallelism',
  'screenshotFailures'
]);

/**
 * Applies common per-project Vitest overrides (`testTimeout`, `hookTimeout`,
 * `retry`, `fileParallelism`, and browser `screenshotFailures`) across
 * `config.test.projects` (or a named subset). Vitest's `mergeConfig`
 * concatenates `test.projects` arrays rather than merging entries by name, so
 * per-project overrides must update existing project entries directly.
 */
export function applyProjectDefaults(config, defaults = {}, projectNames) {
  if (!defaults || Object.keys(defaults).length === 0) {
    return config;
  }

  for (const key of Object.keys(defaults)) {
    if (!PROJECT_DEFAULT_KEYS.has(key)) {
      throw new Error(`Unsupported Vitest project default key: "${key}".`);
    }
  }

  const projects = config?.test?.projects;
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('Expected Vitest config to define non-empty test.projects.');
  }

  const targetNames = projectNames
    ? new Set(typeof projectNames === 'string' ? [projectNames] : projectNames)
    : null;
  if (targetNames) {
    const availableNames = new Set(projects.map(project => project?.test?.name));
    for (const name of targetNames) {
      if (!availableNames.has(name)) {
        throw new Error(
          `Unknown Vitest project "${name}". Available projects: ${[
            ...availableNames
          ].join(', ')}`
        );
      }
    }
  }

  for (const project of projects) {
    if (!project?.test) {
      throw new Error('Expected every Vitest project to define a test block.');
    }
    if (targetNames && !targetNames.has(project.test.name)) {
      continue;
    }

    if (defaults.testTimeout !== undefined) {
      project.test.testTimeout = defaults.testTimeout;
    }
    if (defaults.hookTimeout !== undefined) {
      project.test.hookTimeout = defaults.hookTimeout;
    }
    if (defaults.retry !== undefined) {
      project.test.retry = defaults.retry;
    }
    if (defaults.fileParallelism !== undefined) {
      project.test.fileParallelism = defaults.fileParallelism;
    }
    if (
      defaults.screenshotFailures !== undefined &&
      project.test.name === 'browser'
    ) {
      if (!project.test.browser) {
        throw new Error(
          'Expected browser Vitest project to define test.browser.'
        );
      }
      project.test.browser.screenshotFailures = defaults.screenshotFailures;
    }
  }

  return config;
}

export function createBaseConfig(
  importMetaUrl,
  customConfig = {},
  projectDefaults
) {
  const packageDir = typeof importMetaUrl === 'string'
    ? (importMetaUrl.startsWith('file:') ? path.dirname(fileURLToPath(importMetaUrl)) : importMetaUrl)
    : process.cwd();

  const setupFile = path.resolve(packageDir, 'test/setup.ts');
  const setupFiles = fs.existsSync(setupFile) ? [setupFile] : [];

  const base = defineConfig({
    test: {
      globals: true,
      reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
      projects: [
        {
          test: {
            name: 'node',
            globals: true,
            environment: 'node',
            pool: 'forks',
            maxWorkers: maxForks,
            isolate: true,
            passWithNoTests: false,
            include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
            exclude: ['**/browser/**', '**/*.browser.test.ts'],
            setupFiles
          }
        },
        {
          plugins: [
            {
              name: 'disable-vite-etag-cache',
              configureServer(server) {
                server.middlewares.use((req, res, next) => {
                  delete req.headers['if-none-match'];
                  res.setHeader('Cache-Control', 'no-store');
                  next();
                });
              }
            }
          ],
          server: {
            headers: {
              'Cache-Control': 'no-store'
            }
          },
          test: {
            name: 'browser',
            globals: true,
            maxWorkers: maxForks,
            browser: {
              enabled: true,
              provider: createPlaywrightProvider({
                launchOptions: {
                  args: ['--disk-cache-size=1', '--media-cache-size=1']
                }
              }),
              instances: [
                { browser: 'chromium' }
              ],
              headless: true
            },
            isolate: true,
            passWithNoTests: false,
            include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
            exclude: ['**/node/**', '**/*.node.test.ts'],
            setupFiles
          }
        }
      ]
    }
  });

  const merged =
    customConfig && Object.keys(customConfig).length > 0
      ? mergeConfig(base, customConfig)
      : base;

  return projectDefaults
    ? applyProjectDefaults(merged, projectDefaults)
    : merged;
}

export default createBaseConfig;

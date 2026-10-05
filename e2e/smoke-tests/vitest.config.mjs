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

import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function isChromiumInstalled() {
  try {
    const { chromium } = require('playwright');
    const execPath = chromium.executablePath();
    if (!fs.existsSync(execPath)) return false;

    const parts = execPath.split(path.sep);
    const chromiumDirIndex = parts.findIndex(part =>
      part.startsWith('chromium-')
    );
    if (chromiumDirIndex === -1) return false;

    const revision = parts[chromiumDirIndex].substring('chromium-'.length);
    const msPlaywrightRoot = parts.slice(0, chromiumDirIndex).join(path.sep);

    let platformSuffix = '';
    let exeName = 'headless_shell';
    if (process.platform === 'win32') {
      platformSuffix = 'win';
      exeName = 'headless_shell.exe';
    } else if (process.platform === 'darwin') {
      platformSuffix = 'mac';
    } else {
      platformSuffix = 'linux';
    }

    const headlessShellPath = path.join(
      msPlaywrightRoot,
      `chromium_headless_shell-${revision}`,
      `chrome-${platformSuffix}`,
      exeName
    );

    return fs.existsSync(headlessShellPath);
  } catch {
    return false;
  }
}

if (!isChromiumInstalled()) {
  console.log(
    '[smoke-tests] Playwright Chromium / Headless Shell not found. Installing...'
  );
  execSync('npx playwright install chromium chromium-headless-shell', {
    stdio: 'inherit'
  });
}

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    setupFiles: ['./tests/setup.ts'],
    provide: {
      APP_CHECK_DEBUG_TOKEN: process.env.APP_CHECK_DEBUG_TOKEN
    },
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
      screenshotFailures: false
    }
  }
});

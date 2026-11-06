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

const { execSync } = require('child_process');
const fs = require('fs');

const BROWSER_EXECUTABLES = {
  ChromeHeadless: ['chromium', 'chromium-headless-shell'],
  chromium: ['chromium', 'chromium-headless-shell'],
  chrome: ['chromium', 'chromium-headless-shell'],
  WebkitHeadless: ['webkit'],
  webkit: ['webkit'],
  safari: ['webkit'],
  Firefox: ['firefox'],
  FirefoxHeadless: ['firefox'],
  firefox: ['firefox']
};

function getRequiredExecutables() {
  if (!process.env.BROWSERS) {
    return ['chromium', 'chromium-headless-shell'];
  }
  const executables = new Set();
  for (const browser of process.env.BROWSERS.split(',')) {
    const mapped = BROWSER_EXECUTABLES[browser.trim()];
    if (mapped) {
      for (const exec of mapped) {
        executables.add(exec);
      }
    }
  }
  return executables.size > 0
    ? [...executables]
    : ['chromium', 'chromium-headless-shell'];
}

function areExecutablesInstalled(executables) {
  try {
    const coreBundle = require(
      require.resolve('playwright-core/lib/coreBundle', {
        paths: [process.cwd(), __dirname]
      })
    );
    const { registry } = coreBundle.registry;
    return executables.every(name =>
      fs.existsSync(registry.findExecutable(name).executablePath())
    );
  } catch {
    return false;
  }
}

function isChromiumInstalled() {
  return areExecutablesInstalled(['chromium', 'chromium-headless-shell']);
}

function ensurePlaywright() {
  const executables = getRequiredExecutables();
  if (!areExecutablesInstalled(executables)) {
    const browserList = executables.join(' ');
    console.log(
      `[ensure_playwright] Playwright browser binaries (${browserList}) not found. Installing...`
    );
    try {
      execSync(`npx playwright install ${browserList}`, {
        stdio: 'inherit'
      });
    } catch (err) {
      console.error(
        `[ensure_playwright] Failed to install Playwright browsers (${browserList}):`,
        err
      );
      process.exit(1);
    }
  }
}

// Ensure binary exists on execution
ensurePlaywright();

module.exports = {
  isChromiumInstalled,
  ensurePlaywright
};

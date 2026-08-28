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

function isChromiumInstalled() {
  try {
    const { chromium } = require('playwright');
    const execPath = chromium.executablePath();
    if (!fs.existsSync(execPath)) return false;
    const headlessShellPath = execPath
      .replace('/chromium-', '/chromium_headless_shell-')
      .replace(/\/chrome$/, '/headless_shell');
    if (!fs.existsSync(headlessShellPath)) return false;
    return true;
  } catch {
    return false;
  }
}

if (!isChromiumInstalled()) {
  console.log(
    '[ensure_playwright] Playwright Chromium / Headless Shell not found. Installing...'
  );
  try {
    execSync('npx playwright install chromium chromium-headless-shell', {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error(
      '[ensure_playwright] Failed to install Playwright Chromium:',
      err
    );
    process.exit(1);
  }
}

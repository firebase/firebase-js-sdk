/**
 * @license
 * Copyright 2025 Google LLC
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

const { writeFile, readFile } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { isAbsolute, join } = require('node:path');

async function getPartialConfig() {
  if (!process.env.FIREBASE_WEBAPP_CONFIG) {
    return undefined;
  }

  // Like FIREBASE_CONFIG (admin autoinit) FIREBASE_WEBAPP_CONFIG can be
  // either a JSON representation of FirebaseOptions or the path to a filename
  if (process.env.FIREBASE_WEBAPP_CONFIG.startsWith('{"')) {
    try {
      return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch (e) {
      console.warn(
        'FIREBASE_WEBAPP_CONFIG could not be parsed, ignoring.\n',
        e
      );
      return undefined;
    }
  }

  const fileName = process.env.FIREBASE_WEBAPP_CONFIG;
  const fileURL = pathToFileURL(
    isAbsolute(fileName) ? fileName : join(process.cwd(), fileName)
  );
  try {
    const fileContents = await readFile(fileURL, 'utf-8');
    return JSON.parse(fileContents);
  } catch (e) {
    console.warn(
      `Contents of "${fileName}" could not be parsed, ignoring FIREBASE_WEBAPP_CONFIG.\n`,
      e
    );
    return undefined;
  }
}

async function getFullConfig(partialConfig) {
  if (!partialConfig) {
    return undefined;
  }
  // In Firebase App Hosting the config provided to the environment variable is up-to-date and
  // "complete" we should not reach out to the webConfig endpoint to freshen it
  if (process.env.X_GOOGLE_TARGET_PLATFORM === 'fah') {
    return partialConfig;
  }
  const projectId = partialConfig.projectId || '-';
  // If the projectId starts with demo- this is an demo project from the firebase emulators
  // treat the config as whole
  if (projectId.startsWith('demo-')) {
    return partialConfig;
  }
  const appId = partialConfig.appId;
  const apiKey = partialConfig.apiKey;
  if (!appId || !apiKey) {
    console.warn(
      `Unable to fetch Firebase config, appId and apiKey are required, ignoring FIREBASE_WEBAPP_CONFIG.`
    );
    return undefined;
  }

  const url = `https://firebase.googleapis.com/v1alpha/projects/${projectId}/apps/${appId}/webConfig`;
  try {
    const response = await fetch(url, {
      headers: { 'x-goog-api-key': apiKey }
    });
    if (!response.ok) {
      console.warn(
        `Unable to fetch Firebase config, ignoring FIREBASE_WEBAPP_CONFIG.`
      );
      console.warn(
        `${url} returned ${response.statusText} (${response.status})`
      );
      try {
        console.warn((await response.json()).error.message);
      } catch (e) {}
      return undefined;
    }
    const json = await response.json();
    return { ...json, apiKey };
  } catch (e) {
    console.warn(
      `Unable to fetch Firebase config, ignoring FIREBASE_WEBAPP_CONFIG.\n`,
      e
    );
  }
}

try {
  getPartialConfig()
    .then(getFullConfig)
    .then(async config => {
      const emulatorHosts = {
        firestore: process.env.FIRESTORE_EMULATOR_HOST,
        database: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
        storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST
      };

      const defaults = config && { config, emulatorHosts };

      await Promise.all([
        writeFile(
          join(__dirname, 'dist', 'autoinit_env.js'),
          `'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.postinstallDefaults = ${JSON.stringify(defaults)};`
        ),
        writeFile(
          join(__dirname, 'dist', 'autoinit_env.mjs'),
          `const postinstallDefaults = ${JSON.stringify(defaults)};
export { postinstallDefaults };`
        )
      ]);

      process.exit(0);
    });
} catch (e) {
  console.warn(
    'Unexpected error encountered in @firebase/util postinstall script, ignoring FIREBASE_WEBAPP_CONFIG\n',
    e
  );
  process.exit(0);
}

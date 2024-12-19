/**
 * @license
 * Copyright 2024 Google LLC
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

const { exec } = require('child_process');

const MAX_ATTEMPTS = 15;
const RETRY_DELAY_SECONDS = 60;

async function pollNpmPublish() {
  const version = process.env.VERSION;

  if (!version) {
    console.log(`Couldn't find env var VERSION.`);
    return;
  }

  const getNpmPublishedVersion = () =>
    new Promise((resolve, reject) => {
      exec(`npm view firebase@${version} version`, (error, stdout) => {
        if (error) {
          reject(error);
        }
        const version = stdout.trim();
        if (!version.match(/^\d+\.\d+\.\d+$/)) {
          reject(
            new Error(
              `npm view did not return a valid semver version. Received: ${version}`
            )
          );
        }
        resolve(version);
      });
    });
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const latestPublishedVersion = await getNpmPublishedVersion();
    if (latestPublishedVersion === process.env.VERSION) {
      console.log(`Found firebase@${version} in the npm registry.`);
      return;
    }
    console.log(`Didn't find firebase@${version} in the npm registry.`);
    if (i < MAX_ATTEMPTS - 1) {
      console.log(`Trying again in ${RETRY_DELAY_SECONDS} seconds.`);
      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAY_SECONDS * 1000)
      );
    }
  }
  console.log(
    `Was not able to find firebase@${version} on npm. Ending process.`
  );
  process.exit(1);
}

pollNpmPublish();

/**
 * @license
 * Copyright 2021 Google LLC
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

/**
 * Add a patch changeset for `@firebase/app` to force its release, so that
 * the SDK_VERSION is up to date with the version of the umbrella package firebase.
 *
 * For background, see https://github.com/firebase/firebase-js-sdk/issues/4235
 */

import { writeFileSync } from 'fs';
import { projectRoot } from './utils';
import { exec } from 'child-process-promise';

const CONTENT = `
---
'@firebase/app': patch
---

Update SDK_VERSION.
`;

const FILE_PATH = `${projectRoot}/.changeset/bump-sdk-version.md`;

async function addChangeSet() {
  // check if a few firebase version is being released
  try {
    const { stdout } = await exec('yarn changeset status');
    // only add a changeset for @firebase/app if
    // 1. we are publishing a new firebase version. and
    // 2. @firebase/app is not already being published
    const firebaseRelease = stdout.includes('- firebase\n');
    const firebaseAppRelease = stdout.includes('- @firebase/app\n');
    if (firebaseRelease && !firebaseAppRelease) {
      console.log('Creating a patch changeset for @firebase/app');
      writeFileSync(FILE_PATH, CONTENT, {
        encoding: 'utf-8'
      });
    } else if (firebaseAppRelease) {
      console.log(
        'Skip creating a patch changeset for @firebase/app because it is already part of the release'
      );
    } else {
      console.log(
        'Skip creating a patch changeset for @firebase/app because firebase is not being released'
      );
    }
  } catch (e) {
    // log the error, the exit without creating a changeset
    console.log('error:', e);
  }
}

addChangeSet();

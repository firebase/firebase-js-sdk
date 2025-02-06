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

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { projectRoot } from '../utils';
import { exec } from 'child-process-promise';

const APP_CHANGESET_CONTENT = `
---
'@firebase/app': patch
---

Update SDK_VERSION.
`;

function firebaseChangesetContent(type: ReleaseType, maxProducts: string[]) {
  return `
---
'firebase': ${type}
---

Update root "firebase" package as a "${type}" release due to bumps in:
${maxProducts.join('\n')}.
`;
}

const CHANGESET_DIR_PATH = `${projectRoot}/.changeset/`;

interface ChangesetEntry {
  releases: Array<{
    name: string;
    type: ReleaseType;
  }>;
  summary: string;
  id: string;
}

type ReleaseType = 'none' | 'patch' | 'minor' | 'major';

const releaseTypeValues: Record<ReleaseType, number> = {
  'none': 0,
  'patch': 1,
  'minor': 2,
  'major': 3
};

async function addChangeSet() {
  // check if a few firebase version is being released
  try {
    // The way actions/checkout works, there is no local `main` branch, but it
    // has access to the remote origin/main.
    await exec(`yarn changeset status --output changeset-temp.json`);
    const changesets: ChangesetEntry[] =
      require(`${projectRoot}/changeset-temp.json`).changesets;
    // only add a changeset for @firebase/app if
    // 1. we are publishing a new firebase version. and
    // 2. @firebase/app is not already being published
    let firebaseRelease: ReleaseType = 'none';
    let firebaseAppRelease: ReleaseType = 'none';
    let maxProductRelease: ReleaseType = 'none';
    let maxProducts: string[] = [];
    for (const changeset of changesets) {
      for (const release of changeset.releases) {
        // Track any 'firebase' release
        if (
          release.name === 'firebase' &&
          releaseTypeValues[release.type] > releaseTypeValues[firebaseRelease]
        ) {
          firebaseRelease = release.type;
        }
        // Track any '@firebase/app' release
        if (
          release.name === '@firebase/app' &&
          releaseTypeValues[release.type] >
            releaseTypeValues[firebaseAppRelease]
        ) {
          firebaseAppRelease = release.type;
        }
        // Track any minor or greater release that isn't 'firebase'
        if (
          release.name !== 'firebase' &&
          releaseTypeValues[release.type] >=
            releaseTypeValues[maxProductRelease]
        ) {
          if (
            releaseTypeValues[release.type] ===
            releaseTypeValues[maxProductRelease]
          ) {
            maxProducts.push(release.name);
          } else {
            maxProducts = [release.name];
          }
          maxProductRelease = release.type;
        }
      }
    }
    if (
      releaseTypeValues[firebaseRelease] > 0 &&
      releaseTypeValues[firebaseAppRelease] === 0
    ) {
      console.log('Creating a patch changeset for @firebase/app');
      writeFileSync(
        join(CHANGESET_DIR_PATH, 'bump-sdk-version.md'),
        APP_CHANGESET_CONTENT,
        {
          encoding: 'utf-8'
        }
      );
    } else if (firebaseAppRelease) {
      console.log(
        'Skip creating a patch changeset for @firebase/app because it is already part of the release'
      );
    } else {
      console.log(
        'Skip creating a patch changeset for @firebase/app because firebase is not being released'
      );
    }
    if (
      releaseTypeValues[maxProductRelease] > releaseTypeValues['patch'] &&
      releaseTypeValues[maxProductRelease] > releaseTypeValues[firebaseRelease]
    ) {
      console.log(
        `Creating a ${maxProductRelease} changeset for firebase due to ${maxProducts.join(', ')}`
      );
      writeFileSync(
        join(CHANGESET_DIR_PATH, 'bump-root-package.md'),
        firebaseChangesetContent(maxProductRelease, maxProducts),
        {
          encoding: 'utf-8'
        }
      );
    }
  } catch (e) {
    // log the error, the exit without creating a changeset
    console.log('error:', e);
  }
}

addChangeSet();

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

import { expect } from 'chai';
import { getEmulatorHostAndPort } from '../../src/impl/discovery';
import {
  loadDatabaseRules,
  loadFirestoreRules,
  loadStorageRules
} from '../../src/impl/rules';

describe('loadDatabaseRules()', () => {
  it('succeeds on valid input', async function () {
    await loadDatabaseRules(
      getEmulatorHostAndPort('database')!,
      'foo',
      '{ "rules": {} }'
    );
  });
  it('fails on invalid input', async function () {
    await expect(
      loadDatabaseRules(
        getEmulatorHostAndPort('database')!,
        'foo',
        'invalid json %{!@['
      )
    ).to.be.rejectedWith(/Parse error/);
  });
});

describe('loadFirestoreRules()', () => {
  it('loadFirestoreRules() succeeds on valid input', async function () {
    await loadFirestoreRules(
      getEmulatorHostAndPort('firestore')!,
      'foo',
      `service cloud.firestore {
        match /databases/{db}/documents/{doc=**} {
          allow read, write;
        }
      }`
    );
  });
  it('fails on invalid input', async function () {
    await expect(
      loadFirestoreRules(
        getEmulatorHostAndPort('firestore')!,
        'foo',
        `rules_version = '2';
         service cloud.firestore {
           banana
         }`
      )
    ).to.be.rejectedWith(/INVALID_ARGUMENT/);
  });
});

describe('loadStorageRules()', () => {
  it('loadStorageRules() succeeds on valid input', async function () {
    await loadStorageRules(
      getEmulatorHostAndPort('storage')!,
      `service firebase.storage {
        match /b/{bucket}/o {
          match /{allPaths=**} {
            allow read, write: if false;
          }
        }
      }`
    );
  });
  it('fails on invalid input', async function () {
    await expect(
      loadStorageRules(
        getEmulatorHostAndPort('storage')!,
        `rules_version = '2';
         service firebase.storage {
           banana
         }`
      )
    ).to.be.rejectedWith(/error updating rules/);
  });
});

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

import { expect } from 'chai';

import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { encodeBase64 } from '../../../src/platform/base64';
import { ByteString } from '../../../src/util/byte_string';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestGlobalsCache } from './test_globals_cache';

let persistence: Persistence;

describe('MemoryGlobals', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryEagerPersistence().then(p => {
      persistence = p;
    });
  });

  genericGlobalsTests();
});

describe('IndexedDbGlobals', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbMutationQueue tests.');
    return;
  }

  beforeEach(() => {
    return persistenceHelpers.testIndexedDbPersistence().then(p => {
      persistence = p;
    });
  });

  genericGlobalsTests();
});

/**
 * Defines the set of tests to run against both mutation queue
 * implementations.
 */
function genericGlobalsTests(): void {
  let cache: TestGlobalsCache;

  beforeEach(() => {
    cache = new TestGlobalsCache(persistence);
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  it('returns session token that was previously saved', async () => {
    const token = ByteString.fromBase64String(encodeBase64('theToken'));

    await cache.setSessionToken(token);
    const result = await cache.getSessionToken();
    expect(result.isEqual(token)).to.be.true;
  });

  it('returns empty session token that was previously saved', async () => {
    await cache.setSessionToken(ByteString.EMPTY_BYTE_STRING);
    const result = await cache.getSessionToken();
    expect(result.isEqual(ByteString.EMPTY_BYTE_STRING)).to.be.true;
  });
}

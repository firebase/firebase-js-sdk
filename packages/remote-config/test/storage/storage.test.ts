/**
 * @license
 * Copyright 2019 Google LLC
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

import '../setup';
import { expect } from 'chai';
import {
  ThrottleMetadata,
  openDatabase,
  APP_NAMESPACE_STORE,
  IndexedDbStorage,
  InMemoryStorage,
  Storage
} from '../../src/storage/storage';
import { FetchResponse } from '../../src';

// Clears global IndexedDB state.
async function clearDatabase(): Promise<void> {
  const db = await openDatabase();
  db.transaction([APP_NAMESPACE_STORE], 'readwrite')
    .objectStore(APP_NAMESPACE_STORE)
    .clear();
}

describe('Storage', () => {
  const indexedDbTestCase = {
    getStorage: () => new IndexedDbStorage('appId', 'appName', 'namespace'),
    name: 'IndexedDbStorage'
  };

  const inMemoryStorage = {
    getStorage: () => new InMemoryStorage(),
    name: 'InMemoryStorage'
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  it(`${indexedDbTestCase.name} constructs a composite key`, async () => {
    // This is defensive, but the cost of accidentally changing the key composition is high.
    expect(
      indexedDbTestCase.getStorage().createCompositeKey('throttle_metadata')
    ).to.eq('appId,appName,namespace,throttle_metadata');
  });

  for (const { name, getStorage } of [indexedDbTestCase, inMemoryStorage]) {
    describe(name, () => {
      let storage: Storage;

      beforeEach(() => {
        storage = getStorage();
      });

      it('sets and gets last fetch attempt status', async () => {
        const expectedStatus = 'success';

        await storage.setLastFetchStatus(expectedStatus);

        const actualStatus = await storage.getLastFetchStatus();

        expect(actualStatus).to.deep.eq(expectedStatus);
      });

      it('sets and gets last fetch success timestamp', async () => {
        const lastSuccessfulFetchTimestampMillis = 123;

        await storage.setLastSuccessfulFetchTimestampMillis(
          lastSuccessfulFetchTimestampMillis
        );

        const actualMetadata =
          await storage.getLastSuccessfulFetchTimestampMillis();

        expect(actualMetadata).to.deep.eq(lastSuccessfulFetchTimestampMillis);
      });

      it('sets and gets last successful fetch response', async () => {
        const lastSuccessfulFetchResponse = { status: 200 } as FetchResponse;

        await storage.setLastSuccessfulFetchResponse(
          lastSuccessfulFetchResponse
        );

        const actualConfig = await storage.getLastSuccessfulFetchResponse();

        expect(actualConfig).to.deep.eq(lastSuccessfulFetchResponse);
      });

      it('sets and gets active config', async () => {
        const expectedConfig = { key: 'value' };

        await storage.setActiveConfig(expectedConfig);

        const storedConfig = await storage.getActiveConfig();

        expect(storedConfig).to.deep.eq(expectedConfig);
      });

      it('sets and gets active config etag', async () => {
        const expectedEtag = 'etag';

        await storage.setActiveConfigEtag(expectedEtag);

        const storedConfigEtag = await storage.getActiveConfigEtag();

        expect(storedConfigEtag).to.deep.eq(expectedEtag);
      });

      it('sets, gets and deletes throttle metadata', async () => {
        const expectedMetadata = {
          throttleEndTimeMillis: 1
        } as ThrottleMetadata;

        await storage.setThrottleMetadata(expectedMetadata);

        let actualMetadata = await storage.getThrottleMetadata();

        expect(actualMetadata).to.deep.eq(expectedMetadata);

        await storage.deleteThrottleMetadata();

        actualMetadata = await storage.getThrottleMetadata();

        expect(actualMetadata).to.be.undefined;
      });

      it('sets and gets custom signals', async () => {
        const customSignals = { key: 'value', key1: 'value1', key2: 1 };
        const customSignalsInStorage = {
          key: 'value',
          key1: 'value1',
          key2: '1'
        };

        await storage.setCustomSignals(customSignals);

        const storedCustomSignals = await storage.getCustomSignals();

        expect(storedCustomSignals).to.deep.eq(customSignalsInStorage);
      });

      it('upserts custom signals when key is present in storage', async () => {
        const customSignals = { key: 'value', key1: 'value1' };
        const updatedSignals = { key: 'value', key1: 'value2' };

        await storage.setCustomSignals(customSignals);

        await storage.setCustomSignals({ key1: 'value2' });

        const storedCustomSignals = await storage.getCustomSignals();

        expect(storedCustomSignals).to.deep.eq(updatedSignals);
      });

      it('deletes custom signal when value supplied is null', async () => {
        const customSignals = { key: 'value', key1: 'value1' };
        const updatedSignals = { key: 'value' };

        await storage.setCustomSignals(customSignals);

        await storage.setCustomSignals({ key1: null });

        const storedCustomSignals = await storage.getCustomSignals();

        expect(storedCustomSignals).to.deep.eq(updatedSignals);
      });

      it('throws an error when supplied with excess custom signals', async () => {
        const customSignals: { [key: string]: string } = {};
        for (let i = 0; i < 101; i++) {
          customSignals[`key${i}`] = `value${i}`;
        }

        await expect(
          storage.setCustomSignals(customSignals)
        ).to.eventually.be.rejectedWith(
          'Remote Config: Setting more than 100 custom signals is not supported.'
        );
      });
    });
  }
});

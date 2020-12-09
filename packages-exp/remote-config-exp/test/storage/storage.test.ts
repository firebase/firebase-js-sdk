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
  Storage,
  ThrottleMetadata,
  openDatabase,
  APP_NAMESPACE_STORE
} from '../../src/storage/storage';
import { FetchResponse } from '../../src/client/remote_config_fetch_client';

// Clears global IndexedDB state.
async function clearDatabase(): Promise<void> {
  const db = await openDatabase();
  db.transaction([APP_NAMESPACE_STORE], 'readwrite')
    .objectStore(APP_NAMESPACE_STORE)
    .clear();
}

describe('Storage', () => {
  const storage = new Storage('appId', 'appName', 'namespace');

  beforeEach(async () => {
    await clearDatabase();
  });

  it('constructs a composite key', async () => {
    // This is defensive, but the cost of accidentally changing the key composition is high.
    expect(storage.createCompositeKey('throttle_metadata')).to.eq(
      'appId,appName,namespace,throttle_metadata'
    );
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

    const actualMetadata = await storage.getLastSuccessfulFetchTimestampMillis();

    expect(actualMetadata).to.deep.eq(lastSuccessfulFetchTimestampMillis);
  });

  it('sets and gets last successful fetch response', async () => {
    const lastSuccessfulFetchResponse = { status: 200 } as FetchResponse;

    await storage.setLastSuccessfulFetchResponse(lastSuccessfulFetchResponse);

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
});

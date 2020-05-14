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

import { expect } from 'chai';
import '../testing/setup';
import { openDb } from 'idb';
import {
  migrateOldDatabase,
  V2TokenDetails,
  V3TokenDetails,
  V4TokenDetails
} from './migrate-old-database';
import { FakePushSubscription } from '../testing/fakes/service-worker';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { base64ToArray } from './array-base64-translator';

describe('migrateOldDb', () => {
  it("does nothing if old DB didn't exist", async () => {
    const tokenDetails = await migrateOldDatabase('1234567890');
    expect(tokenDetails).to.be.null;
  });

  it('does nothing if old DB was too old', async () => {
    await put(1, {
      swScope: '/scope-value',
      fcmSenderId: '1234567890',
      fcmToken: 'token-value'
    });

    const tokenDetails = await migrateOldDatabase('1234567890');
    expect(tokenDetails).to.be.null;
  });

  describe('version 2', () => {
    beforeEach(async () => {
      const v2TokenDetails: V2TokenDetails = {
        fcmToken: 'token-value',
        swScope: '/scope-value',
        vapidKey: base64ToArray('dmFwaWQta2V5LXZhbHVl'),
        fcmSenderId: '1234567890',
        fcmPushSet: '7654321',
        auth: 'YXV0aC12YWx1ZQ',
        p256dh: 'cDI1Ni12YWx1ZQ',
        endpoint: 'https://example.org',
        subscription: new FakePushSubscription()
      };

      await put(2, v2TokenDetails);
    });

    it('can get a value from old DB', async () => {
      const tokenDetails = await migrateOldDatabase('1234567890');

      const expectedTokenDetails = getFakeTokenDetails();
      // Ignore createTime difference.
      expectedTokenDetails.createTime = tokenDetails!.createTime;

      expect(tokenDetails).to.deep.equal(expectedTokenDetails);
    });

    it('only migrates once', async () => {
      await migrateOldDatabase('1234567890');
      const tokenDetails = await migrateOldDatabase('1234567890');

      expect(tokenDetails).to.be.null;
    });

    it('does not get a value that has a different sender ID', async () => {
      const tokenDetails = await migrateOldDatabase('321321321');
      expect(tokenDetails).to.be.null;
    });

    it('does not migrate an entry with missing optional values', async () => {
      const v2TokenDetails: V2TokenDetails = {
        fcmToken: 'token-value',
        swScope: '/scope-value',
        vapidKey: base64ToArray('dmFwaWQta2V5LXZhbHVl'),
        fcmSenderId: '1234567890',
        fcmPushSet: '7654321',
        subscription: new FakePushSubscription()
      };
      await put(2, v2TokenDetails);

      const tokenDetails = await migrateOldDatabase('1234567890');
      expect(tokenDetails).to.be.null;
    });
  });

  describe('version 3', () => {
    beforeEach(async () => {
      const v3TokenDetails: V3TokenDetails = {
        createTime: 1234567890,
        fcmToken: 'token-value',
        swScope: '/scope-value',
        vapidKey: base64ToArray('dmFwaWQta2V5LXZhbHVl'),
        fcmSenderId: '1234567890',
        fcmPushSet: '7654321',
        auth: base64ToArray('YXV0aC12YWx1ZQ'),
        p256dh: base64ToArray('cDI1Ni12YWx1ZQ'),
        endpoint: 'https://example.org'
      };

      await put(3, v3TokenDetails);
    });

    it('can get a value from old DB', async () => {
      const tokenDetails = await migrateOldDatabase('1234567890');

      const expectedTokenDetails = getFakeTokenDetails();

      expect(tokenDetails).to.deep.equal(expectedTokenDetails);
    });

    it('only migrates once', async () => {
      await migrateOldDatabase('1234567890');
      const tokenDetails = await migrateOldDatabase('1234567890');

      expect(tokenDetails).to.be.null;
    });

    it('does not get a value that has a different sender ID', async () => {
      const tokenDetails = await migrateOldDatabase('321321321');
      expect(tokenDetails).to.be.null;
    });
  });

  describe('version 4', () => {
    beforeEach(async () => {
      const v4TokenDetails: V4TokenDetails = {
        createTime: 1234567890,
        fcmToken: 'token-value',
        swScope: '/scope-value',
        vapidKey: base64ToArray('dmFwaWQta2V5LXZhbHVl'),
        fcmSenderId: '1234567890',
        auth: base64ToArray('YXV0aC12YWx1ZQ'),
        p256dh: base64ToArray('cDI1Ni12YWx1ZQ'),
        endpoint: 'https://example.org'
      };

      await put(4, v4TokenDetails);
    });

    it('can get a value from old DB', async () => {
      const tokenDetails = await migrateOldDatabase('1234567890');

      const expectedTokenDetails = getFakeTokenDetails();

      expect(tokenDetails).to.deep.equal(expectedTokenDetails);
    });

    it('only migrates once', async () => {
      await migrateOldDatabase('1234567890');
      const tokenDetails = await migrateOldDatabase('1234567890');

      expect(tokenDetails).to.be.null;
    });

    it('does not get a value that has a different sender ID', async () => {
      const tokenDetails = await migrateOldDatabase('321321321');
      expect(tokenDetails).to.be.null;
    });
  });
});

async function put(version: number, value: object): Promise<void> {
  const db = await openDb('fcm_token_details_db', version, upgradeDb => {
    if (upgradeDb.oldVersion === 0) {
      const objectStore = upgradeDb.createObjectStore(
        'fcm_token_object_Store',
        {
          keyPath: 'swScope'
        }
      );
      objectStore.createIndex('fcmSenderId', 'fcmSenderId', {
        unique: false
      });
      objectStore.createIndex('fcmToken', 'fcmToken', { unique: true });
    }
  });

  try {
    const tx = db.transaction('fcm_token_object_Store', 'readwrite');
    await tx.objectStore('fcm_token_object_Store').put(value);
    await tx.complete;
  } finally {
    db.close();
  }
}

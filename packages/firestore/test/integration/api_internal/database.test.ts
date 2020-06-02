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

import * as chaiAsPromised from 'chai-as-promised';

import { expect, use } from 'chai';

import { User } from '../../../src/auth/user';
import { SimpleDb } from '../../../src/local/simple_db';
import { apiDescribe, withTestDoc } from '../util/helpers';
import { withMockCredentialProviderTestDb } from '../util/internal_helpers';

// tslint:disable:no-floating-promises
use(chaiAsPromised);

apiDescribe('Database (with internal API)', (persistence: boolean) => {
  // eslint-disable-next-line no-restricted-properties
  (persistence ? it : it.skip)(
    'will reject the promise if clear persistence fails',
    async () => {
      await withTestDoc(persistence, async docRef => {
        const oldDelete = SimpleDb.delete;
        try {
          SimpleDb.delete = (name: string): Promise<void> => {
            return Promise.reject('Failed to delete the database.');
          };
          const firestore = docRef.firestore;
          await firestore.app.delete();
          await expect(
            firestore.clearPersistence()
          ).to.eventually.be.rejectedWith('Failed to delete the database.');
        } finally {
          SimpleDb.delete = oldDelete;
        }
      });
    }
  );

  it('waiting for pending writes should fail when user changes', async () => {
    await withMockCredentialProviderTestDb(
      persistence,
      async (db, mockCredentialsProvider) => {
        // Prevent pending writes receiving acknowledgement.
        await db.disableNetwork();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        db.doc('abc/123').set({ foo: 'bar' });
        const awaitPendingWrite = db.waitForPendingWrites();

        mockCredentialsProvider.triggerUserChange(new User('user_1'));

        await expect(awaitPendingWrite).to.be.eventually.rejectedWith(
          "'waitForPendingWrites' promise is rejected due to a user change."
        );
      }
    );
  });

  it('app delete leads to instance termination', async () => {
    await withTestDoc(persistence, async docRef => {
      await docRef.set({ foo: 'bar' });
      const app = docRef.firestore.app;
      await app.delete();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((docRef.firestore as any)._isTerminated).to.be.true;
    });
  });
});

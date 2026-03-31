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

import '../testing/setup';

import * as migrateOldDatabaseModule from '../helpers/migrate-old-database';

import {
  dbDelete,
  dbGet,
  dbRemove,
  dbSet,
  DATABASE_NAME
} from '../internals/idb-manager';

import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { Stub } from '../testing/sinon-types';
import { TokenDetails } from '../interfaces/registration-details';
import { expect } from 'chai';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { stub } from 'sinon';
import * as idb from 'idb';

describe('idb manager', () => {
  let firebaseDependencies: FirebaseInternalDependencies;
  let tokenDetailsA: TokenDetails;
  let tokenDetailsB: TokenDetails;

  beforeEach(() => {
    firebaseDependencies = getFakeFirebaseDependencies();
    tokenDetailsA = getFakeTokenDetails();
    tokenDetailsB = getFakeTokenDetails();
    tokenDetailsA.token = 'TOKEN_A';
    tokenDetailsB.token = 'TOKEN_B';
  });

  afterEach(async () => {
    await dbDelete();
  });

  describe('get / set', () => {
    it('sets a value and then gets the same value back', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);
      const value = await dbGet(firebaseDependencies);
      expect(value).to.deep.equal(tokenDetailsA);
    });

    it('gets undefined for a key that does not exist', async () => {
      const value = await dbGet(firebaseDependencies);
      expect(value).to.be.undefined;
    });

    it('sets and gets multiple values with different keys', async () => {
      const firebaseDependenciesB = getFakeFirebaseDependencies({
        appId: 'different-app-id'
      });
      await dbSet(firebaseDependencies, tokenDetailsA);
      await dbSet(firebaseDependenciesB, tokenDetailsB);
      expect(await dbGet(firebaseDependencies)).to.deep.equal(tokenDetailsA);
      expect(await dbGet(firebaseDependenciesB)).to.deep.equal(tokenDetailsB);
    });

    it('overwrites a value', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);
      await dbSet(firebaseDependencies, tokenDetailsB);
      expect(await dbGet(firebaseDependencies)).to.deep.equal(tokenDetailsB);
    });

    describe('old DB migration', () => {
      let migrateOldDatabaseStub: Stub<
        (typeof migrateOldDatabaseModule)['migrateOldDatabase']
      >;

      beforeEach(() => {
        migrateOldDatabaseStub = stub(
          migrateOldDatabaseModule,
          'migrateOldDatabase'
        ).resolves(tokenDetailsA);
      });

      it('gets value from old DB if there is one', async () => {
        await dbGet(firebaseDependencies);

        expect(migrateOldDatabaseStub).to.have.been.calledOnceWith(
          firebaseDependencies.appConfig.senderId
        );
      });

      it('does not call migrateOldDatabase a second time', async () => {
        await dbGet(firebaseDependencies);
        await dbGet(firebaseDependencies);

        expect(migrateOldDatabaseStub).to.have.been.calledOnceWith(
          firebaseDependencies.appConfig.senderId
        );
      });

      it('does not call migrateOldDatabase if there is already a value in the DB', async () => {
        await dbSet(firebaseDependencies, tokenDetailsA);

        await dbGet(firebaseDependencies);

        expect(migrateOldDatabaseStub).not.to.have.been.called;
      });
    });
  });

  describe('remove', () => {
    it('deletes a key', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);
      await dbRemove(firebaseDependencies);
      expect(await dbGet(firebaseDependencies)).to.be.undefined;
    });

    it('does not throw if key does not exist', async () => {
      await dbRemove(firebaseDependencies);
      expect(await dbGet(firebaseDependencies)).to.be.undefined;
    });
  });

  it('falls back to previous DB version when upgrade fails, preserving existing token reads', async () => {
    const key = firebaseDependencies.appConfig.appId;

    // Pre-create a v1 DB with the token object store and a record.
    const dbV1 = await idb.openDB(DATABASE_NAME, 1, {
      upgrade: upgradeDb => {
        upgradeDb.createObjectStore('firebase-messaging-store');
      }
    });
    const tx = dbV1.transaction('firebase-messaging-store', 'readwrite');
    await tx.objectStore('firebase-messaging-store').put(tokenDetailsA, key);
    await tx.done;
    dbV1.close();

    const realOpenDB = idb.openDB.bind(idb);
    const openDbStub = stub(idb, 'openDB').callsFake(((
      name: string,
      version?: number,
      options?: unknown
    ) => {
      if (name === DATABASE_NAME && version === 2) {
        return Promise.reject(new Error('upgrade failed'));
      }
      return realOpenDB(name, version as any, options as any);
    }) as any);

    const value = await dbGet(firebaseDependencies);
    expect(value).to.deep.equal(tokenDetailsA);
    expect(openDbStub).to.have.been.called;
  });

  it('only initiates one openDB call under concurrent access', async () => {
    const realOpenDB = idb.openDB.bind(idb);
    let releaseOpen!: () => void;
    const barrier = new Promise<void>(resolve => {
      releaseOpen = resolve;
    });

    const openDbStub = stub(idb, 'openDB').callsFake(((
      name: string,
      version?: number,
      options?: unknown
    ) => {
      if (name === DATABASE_NAME && version === 2) {
        return barrier.then(() =>
          realOpenDB(name, version as any, options as any)
        );
      }
      return realOpenDB(name, version as any, options as any);
    }) as any);

    const p1 = dbGet(firebaseDependencies);
    const p2 = dbSet(firebaseDependencies, tokenDetailsA);

    // Both calls should share the same in-flight openDB promise.
    expect(openDbStub.callCount).to.equal(1);

    releaseOpen();
    await Promise.all([p1, p2]);
  });

  it('dbDelete calls deleteDB even if dbPromise is rejected', async () => {
    // Force both "open latest" and fallback open to fail, leaving dbPromise rejected.
    const openDbStub = stub(idb, 'openDB').rejects(new Error('open failed'));

    // Trigger dbPromise creation (it will end up rejected).
    await expect(dbGet(firebaseDependencies)).to.be.rejected;
    expect(openDbStub).to.have.been.called;

    const deleteDbStub = stub(idb, 'deleteDB').resolves();

    // Should still attempt deletion and not throw.
    await dbDelete();
    expect(deleteDbStub).to.have.been.calledOnceWith(DATABASE_NAME);
  });
});

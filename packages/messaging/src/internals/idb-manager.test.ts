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

import { dbGet, dbRemove, dbSet } from '../internals/idb-manager';

import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { Stub } from '../testing/sinon-types';
import { TokenDetails } from '../interfaces/token-details';
import { expect } from 'chai';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { stub } from 'sinon';

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
        typeof migrateOldDatabaseModule['migrateOldDatabase']
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
});

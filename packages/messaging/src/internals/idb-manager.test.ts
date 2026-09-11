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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  dbDelete,
  dbGet,
  dbGetFidRegistration,
  dbRemove,
  dbSet,
  dbSetFidRegistration,
  DATABASE_NAME,
  _resetIdbForTests,
  _setIdbForTests
} from '../internals/idb-manager';

import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { TokenDetails } from '../interfaces/registration-details';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { deleteDB, openDB } from 'idb';

const { mockMigrateOldDatabase } = vi.hoisted(() => ({
  mockMigrateOldDatabase: vi.fn()
}));

vi.mock('../helpers/migrate-old-database', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../helpers/migrate-old-database')>();
  return {
    ...actual,
    migrateOldDatabase: (...args: unknown[]) =>
      mockMigrateOldDatabase.getMockImplementation()
        ? mockMigrateOldDatabase(...args)
        : actual.migrateOldDatabase(...(args as [any]))
  };
});

describe('idb manager', () => {
  let firebaseDependencies: FirebaseInternalDependencies;
  let tokenDetailsA: TokenDetails;
  let tokenDetailsB: TokenDetails;
  let idbForTests: any;

  beforeEach(async () => {
    // Wrap the module namespace in a mutable object so spies can stub methods reliably.
    idbForTests = Object.assign({}, { openDB, deleteDB });
    _setIdbForTests(idbForTests);
    // Ensure no prior suite left an open connection or cached promise.
    await dbDelete();
    firebaseDependencies = getFakeFirebaseDependencies();
    tokenDetailsA = getFakeTokenDetails();
    tokenDetailsB = getFakeTokenDetails();
    tokenDetailsA.token = 'TOKEN_A';
    tokenDetailsB.token = 'TOKEN_B';
  });

  afterEach(async () => {
    await dbDelete();
    _resetIdbForTests();
  });

  describe('get / set', () => {
    it('sets a value and then gets the same value back', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);
      const value = await dbGet(firebaseDependencies);
      expect(value).toEqual(tokenDetailsA);
    });

    it('gets undefined for a key that does not exist', async () => {
      const value = await dbGet(firebaseDependencies);
      expect(value).toBeUndefined();
    });

    it('sets and gets multiple values with different keys', async () => {
      const firebaseDependenciesB = getFakeFirebaseDependencies({
        appId: 'different-app-id'
      });
      await dbSet(firebaseDependencies, tokenDetailsA);
      await dbSet(firebaseDependenciesB, tokenDetailsB);
      expect(await dbGet(firebaseDependencies)).toEqual(tokenDetailsA);
      expect(await dbGet(firebaseDependenciesB)).toEqual(tokenDetailsB);
    });

    it('overwrites a value', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);
      await dbSet(firebaseDependencies, tokenDetailsB);
      expect(await dbGet(firebaseDependencies)).toEqual(tokenDetailsB);
    });

    describe('old DB migration', () => {
      beforeEach(() => {
        mockMigrateOldDatabase.mockResolvedValue(tokenDetailsA);
      });

      afterEach(() => {
        mockMigrateOldDatabase.mockReset();
      });

      it('gets value from old DB if there is one', async () => {
        await dbGet(firebaseDependencies);

        expect(mockMigrateOldDatabase).toHaveBeenCalledTimes(1);
        expect(mockMigrateOldDatabase).toHaveBeenCalledWith(
          firebaseDependencies.appConfig.senderId
        );
      });

      it('does not call migrateOldDatabase a second time', async () => {
        await dbGet(firebaseDependencies);
        await dbGet(firebaseDependencies);

        expect(mockMigrateOldDatabase).toHaveBeenCalledTimes(1);
        expect(mockMigrateOldDatabase).toHaveBeenCalledWith(
          firebaseDependencies.appConfig.senderId
        );
      });

      it('does not call migrateOldDatabase if there is already a value in the DB', async () => {
        await dbSet(firebaseDependencies, tokenDetailsA);

        await dbGet(firebaseDependencies);

        expect(mockMigrateOldDatabase).not.toHaveBeenCalled();
      });
    });
  });

  describe('remove', () => {
    it('deletes a key', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);
      await dbRemove(firebaseDependencies);
      expect(await dbGet(firebaseDependencies)).toBeUndefined();
    });

    it('does not throw if key does not exist', async () => {
      await dbRemove(firebaseDependencies);
      expect(await dbGet(firebaseDependencies)).toBeUndefined();
    });
  });

  it('falls back to previous DB version when upgrade fails, preserving existing token reads', async () => {
    const key = firebaseDependencies.appConfig.appId;

    // Pre-create a v1 DB with the token object store and a record.
    const dbV1 = await openDB(DATABASE_NAME, 1, {
      upgrade: upgradeDb => {
        upgradeDb.createObjectStore('firebase-messaging-store');
      }
    });
    const tx = dbV1.transaction('firebase-messaging-store', 'readwrite');
    await tx.objectStore('firebase-messaging-store').put(tokenDetailsA, key);
    await tx.done;
    dbV1.close();

    const realOpenDB = openDB;
    const openDbStub = vi.spyOn(idbForTests, 'openDB').mockImplementation(((
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
    expect(value).toEqual(tokenDetailsA);
    expect(openDbStub).toHaveBeenCalled();
  });

  it('dbGetFidRegistration and dbSetFidRegistration reject when v2 open fails and the FID object store is missing', async () => {
    const key = firebaseDependencies.appConfig.appId;

    const dbV1 = await openDB(DATABASE_NAME, 1, {
      upgrade: upgradeDb => {
        upgradeDb.createObjectStore('firebase-messaging-store');
      }
    });
    const tx = dbV1.transaction('firebase-messaging-store', 'readwrite');
    await tx.objectStore('firebase-messaging-store').put(tokenDetailsA, key);
    await tx.done;
    dbV1.close();

    const realOpenDB = openDB;
    vi.spyOn(idbForTests, 'openDB').mockImplementation(((
      name: string,
      version?: number,
      options?: unknown
    ) => {
      if (name === DATABASE_NAME && version === 2) {
        return Promise.reject(new Error('upgrade failed'));
      }
      return realOpenDB(name, version as any, options as any);
    }) as any);

    const schemaError = 'messaging/fid-registration-idb-schema-unavailable';

    await expect(dbGetFidRegistration(firebaseDependencies)).rejects.toThrow(
      schemaError
    );
    await expect(
      dbSetFidRegistration(firebaseDependencies, {
        fid: 'some-fid',
        lastRegisterTime: Date.now()
      })
    ).rejects.toThrow(schemaError);
  });

  it('only initiates one openDB call under concurrent access', async () => {
    const realOpenDB = openDB;
    let releaseOpen!: () => void;
    const barrier = new Promise<void>(resolve => {
      releaseOpen = resolve;
    });

    const openDbStub = vi.spyOn(idbForTests, 'openDB').mockImplementation(((
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
    expect(openDbStub).toHaveBeenCalledTimes(1);

    releaseOpen();
    await Promise.all([p1, p2]);
  });

  it('dbDelete calls deleteDB even if dbPromise is rejected', async () => {
    // Force both "open latest" and fallback open to fail, leaving dbPromise rejected.
    const openDbStub = vi
      .spyOn(idbForTests, 'openDB')
      .mockRejectedValue(new Error('open failed'));

    // Trigger dbPromise creation (it will end up rejected).
    await expect(dbGet(firebaseDependencies)).rejects.toThrow();
    expect(openDbStub).toHaveBeenCalled();

    const deleteDbStub = vi
      .spyOn(idbForTests, 'deleteDB')
      .mockResolvedValue(undefined as any);

    // Should still attempt deletion and not throw.
    await dbDelete();
    expect(deleteDbStub).toHaveBeenCalledTimes(1);
    expect(deleteDbStub).toHaveBeenCalledWith(DATABASE_NAME);
  });

  describe('mutual exclusivity', () => {
    it('dbSet deletes FID registration if it exists', async () => {
      await dbSetFidRegistration(firebaseDependencies, {
        fid: 'FID',
        lastRegisterTime: Date.now()
      });

      expect(await dbGetFidRegistration(firebaseDependencies)).toBeDefined();

      await dbSet(firebaseDependencies, tokenDetailsA);

      expect(await dbGetFidRegistration(firebaseDependencies)).toBeUndefined();
      expect(await dbGet(firebaseDependencies)).toEqual(tokenDetailsA);
    });

    it('dbSetFidRegistration deletes legacy token if it exists', async () => {
      await dbSet(firebaseDependencies, tokenDetailsA);

      expect(await dbGet(firebaseDependencies)).toEqual(tokenDetailsA);

      await dbSetFidRegistration(firebaseDependencies, {
        fid: 'FID',
        lastRegisterTime: Date.now()
      });

      expect(await dbGet(firebaseDependencies)).toBeUndefined();
      expect((await dbGetFidRegistration(firebaseDependencies))?.fid).toEqual(
        'FID'
      );
    });
  });
});

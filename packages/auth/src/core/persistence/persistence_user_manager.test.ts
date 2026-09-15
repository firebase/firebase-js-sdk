/**
 * @license
 * Copyright 2026 Google LLC
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

import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import { UserImpl } from '../user/user_impl';
import { _getInstance } from '../util/instantiator';
import {
  PersistenceInternal,
  PersistenceType,
  PersistenceValue,
  StorageEventListener
} from './';
import { inMemoryPersistence } from './in_memory';
import { KeyName, PersistenceUserManager } from './persistence_user_manager';

function makePersistence(
  type = PersistenceType.NONE,
  shouldAllowMigration = false
): {
  persistence: PersistenceInternal;
  stub: any;
} {
  const persistence: any = {
    type,
    _isAvailable: vi.fn().mockResolvedValue(true),
    _set: vi.fn().mockResolvedValue(undefined),
    _get: vi.fn().mockResolvedValue(null),
    _remove: vi.fn().mockResolvedValue(undefined),
    _addListener: vi.fn(),
    _removeListener: vi.fn(),
    _shouldAllowMigration: shouldAllowMigration
  };

  return { persistence, stub: persistence };
}

describe('core/persistence/persistence_user_manager', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  describe('.create', () => {
    it('defaults to inMemory if no list provided', async () => {
      const manager = await PersistenceUserManager.create(auth, []);
      expect(manager.persistence).toBe(_getInstance(inMemoryPersistence));
    });

    it('handles _isAvailable throwing an error and falls back to inMemory', async () => {
      const { persistence, stub } = makePersistence();
      stub._isAvailable.mockRejectedValue(new Error('IndexedDB blocked'));
      const manager = await PersistenceUserManager.create(auth, [persistence]);
      expect(manager.persistence).toBe(_getInstance(inMemoryPersistence));
    });

    it('does not throw in constructor if _addListener throws', async () => {
      const { persistence, stub } = makePersistence();
      stub._addListener.mockImplementation(() => {
        throw new Error('addListener not supported');
      });
      stub._isAvailable.mockResolvedValue(true);
      const manager = await PersistenceUserManager.create(auth, [persistence]);
      expect(manager.persistence).toBe(persistence);
    });

    it('chooses the first one with a user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      a.stub._isAvailable.mockResolvedValue(false);
      a.stub._get.mockResolvedValueOnce(testUser(auth, 'uid').toJSON());
      b.stub._isAvailable.mockResolvedValue(true);
      b.stub._get.mockResolvedValueOnce(testUser(auth, 'uid-b').toJSON());

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._isAvailable).toHaveBeenCalledTimes(1);
      expect(b.stub._isAvailable).toHaveBeenCalledTimes(1);
      expect(c.stub._isAvailable).toHaveBeenCalledTimes(1);

      // a should not be chosen since it is not available (despite having a user).
      expect(out.persistence).toBe(a.persistence);
    });

    it('defaults to first available persistence if no user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      a.stub._isAvailable.mockResolvedValue(false);
      b.stub._isAvailable.mockResolvedValue(true);
      c.stub._isAvailable.mockResolvedValue(true);

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._isAvailable).toHaveBeenCalledTimes(1);
      expect(b.stub._isAvailable).toHaveBeenCalledTimes(1);
      expect(c.stub._isAvailable).toHaveBeenCalledTimes(1);

      // a should not be chosen since it is not available (despite having a user).
      expect(out.persistence).toBe(b.persistence);
    });

    it('searches in order for a user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      const user = testUser(auth, 'uid');
      a.stub._isAvailable.mockResolvedValue(true);
      a.stub._get.mockResolvedValue(user.toJSON());
      b.stub._get.mockResolvedValue(testUser(auth, 'wrong-uid').toJSON());

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._get).toHaveBeenCalledTimes(1);
      expect(b.stub._get).not.toHaveBeenCalled();
      expect(c.stub._get).not.toHaveBeenCalled();

      expect(out.persistence).toBe(a.persistence);
      expect((await out.getCurrentUser())!.uid).toBe(user.uid);
    });

    it('migrate found user to higher order persistence, if applicable', async () => {
      const a = makePersistence(PersistenceType.NONE, true);
      const b = makePersistence(PersistenceType.NONE, true);
      const c = makePersistence(PersistenceType.NONE, true);
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      const user = testUser(auth, 'uid');
      a.stub._isAvailable.mockResolvedValue(true);
      b.stub._isAvailable.mockResolvedValue(true);
      c.stub._isAvailable.mockResolvedValue(true);
      b.stub._get.mockResolvedValue(user.toJSON());
      c.stub._get.mockResolvedValue(testUser(auth, 'wrong-uid').toJSON());

      let persistedUserInA: PersistenceValue | null = null;
      a.stub._set.mockImplementation(async (_, value) => {
        persistedUserInA = value;
      });
      a.stub._get.mockImplementation(async () => persistedUserInA);

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._set).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(b.stub._set).not.toHaveBeenCalled();
      expect(c.stub._set).not.toHaveBeenCalled();
      expect(b.stub._remove).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app'
      );
      expect(c.stub._remove).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app'
      );

      expect(out.persistence).toBe(a.persistence);
      expect((await out.getCurrentUser())!.uid).toBe(user.uid);
    });

    it('migrate found user to available persistence, if applicable', async () => {
      const a = makePersistence(PersistenceType.NONE, true);
      const b = makePersistence(PersistenceType.NONE, true);
      const c = makePersistence(PersistenceType.NONE, true);
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      const user = testUser(auth, 'uid');
      a.stub._isAvailable.mockResolvedValue(false); // Important
      b.stub._isAvailable.mockResolvedValue(true);
      c.stub._isAvailable.mockResolvedValue(true);
      a.stub._get.mockResolvedValue(user.toJSON());
      c.stub._get.mockResolvedValue(testUser(auth, 'wrong-uid').toJSON());

      let persistedUserInB: PersistenceValue | null = null;
      b.stub._set.mockImplementation(async (_, value) => {
        persistedUserInB = value;
      });
      b.stub._get.mockImplementation(async () => persistedUserInB);

      const out = await PersistenceUserManager.create(auth, search);
      expect(b.stub._set).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(a.stub._set).not.toHaveBeenCalled();
      expect(c.stub._set).not.toHaveBeenCalled();
      expect(a.stub._remove).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app'
      );
      expect(c.stub._remove).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app'
      );

      expect(out.persistence).toBe(b.persistence);
      expect((await out.getCurrentUser())!.uid).toBe(user.uid);
    });

    it('uses default user key if none provided', async () => {
      const { stub, persistence } = makePersistence();
      stub._isAvailable.mockResolvedValue(true);
      await PersistenceUserManager.create(auth, [persistence]);
      expect(stub._get).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app'
      );
    });

    it('uses user key if provided', async () => {
      const { stub, persistence } = makePersistence();
      stub._isAvailable.mockResolvedValue(true);
      await PersistenceUserManager.create(
        auth,
        [persistence],
        KeyName.REDIRECT_USER
      );
      expect(stub._get).toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app'
      );
    });

    it('returns in-memory persistence if all else fails', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      a.stub._isAvailable.mockResolvedValue(false);
      b.stub._isAvailable.mockResolvedValue(false);
      c.stub._isAvailable.mockResolvedValue(false);

      const out = await PersistenceUserManager.create(auth, search);
      expect(out.persistence).toBe(_getInstance(inMemoryPersistence));
      expect(a.stub._get).toHaveBeenCalledTimes(1);
      expect(b.stub._get).toHaveBeenCalledTimes(1);
      expect(c.stub._get).toHaveBeenCalledTimes(1);
    });
  });

  describe('manager methods', () => {
    let persistenceStub: sinon.SinonStubbedInstance<PersistenceInternal>;
    let manager: PersistenceUserManager;

    beforeEach(async () => {
      const { persistence, stub } = makePersistence(PersistenceType.SESSION);
      stub._isAvailable.mockResolvedValue(true);
      persistenceStub = stub;
      manager = await PersistenceUserManager.create(auth, [persistence]);
    });

    it('#setCurrentUser calls underlying persistence w/ key', async () => {
      const user = testUser(auth, 'uid');
      await manager.setCurrentUser(user);
      expect(persistenceStub._set).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
    });

    it('#removeCurrentUser calls underlying persistence', async () => {
      await manager.removeCurrentUser();
      expect(persistenceStub._remove).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app'
      );
    });

    it('#getCurrentUser calls with instantiator', async () => {
      const rawObject = {};
      const userImplStub = vi
        .spyOn(UserImpl, '_fromJSON')
        .mockReturnValue(null as any);
      persistenceStub._get.mockReturnValue(Promise.resolve(rawObject));

      await manager.getCurrentUser();
      expect(userImplStub).toHaveBeenCalledWith(auth, rawObject);

      userImplStub.mockRestore();
    });

    it('#savePersistenceForRedirect calls through', async () => {
      await manager.savePersistenceForRedirect();
      expect(persistenceStub._set).toHaveBeenCalledWith(
        'firebase:persistence:test-api-key:test-app',
        'SESSION'
      );
    });

    describe('#setPersistence', () => {
      it('returns immediately if persistence is not changed', async () => {
        const spy = vi.spyOn(manager, 'getCurrentUser');
        await manager.setPersistence(manager.persistence);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
      });

      it('removes current user & sets it in the new persistence', async () => {
        const { persistence: nextPersistence, stub: nextStub } =
          makePersistence();
        const auth = await testAuth();
        const user = testUser(auth, 'uid');
        persistenceStub._get.mockReturnValue(Promise.resolve(user.toJSON()));

        await manager.setPersistence(nextPersistence);
        expect(persistenceStub._get).toHaveBeenCalled();
        expect(persistenceStub._remove).toHaveBeenCalled();
        expect(nextStub._set).toHaveBeenCalledWith(
          'firebase:authUser:test-api-key:test-app',
          user.toJSON()
        );
      });

      it('migrates user for a different persistence even if .type matches', async () => {
        const { persistence, stub } = makePersistence(PersistenceType.LOCAL);
        await manager.setPersistence(persistence);
        const auth = await testAuth();
        const user = testUser(auth, 'uid');
        stub._get.mockReturnValue(Promise.resolve(user.toJSON()));

        const { persistence: nextPersistence, stub: nextStub } =
          makePersistence(PersistenceType.LOCAL);

        // This should migrate the user even if both has type LOCAL. For example, developer may want
        // to switch from localStorage to indexedDB (both type LOCAL) and we should honor that.
        await manager.setPersistence(nextPersistence);
        expect(stub._get).toHaveBeenCalled();
        expect(stub._remove).toHaveBeenCalled();
        expect(nextStub._set).toHaveBeenCalledWith(
          'firebase:authUser:test-api-key:test-app',
          user.toJSON()
        );
      });
    });
  });
});

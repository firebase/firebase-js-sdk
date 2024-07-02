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

import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

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

chai.use(sinonChai);

function makePersistence(
  type = PersistenceType.NONE,
  shouldAllowMigration = false
): {
  persistence: PersistenceInternal;
  stub: sinon.SinonStubbedInstance<PersistenceInternal>;
} {
  const persistence: PersistenceInternal = {
    type,
    _isAvailable: () => Promise.resolve(true),
    _set: async () => {},
    _get() {
      return Promise.resolve(null);
    },
    _remove: async () => {},
    _addListener(_key: string, _listener: StorageEventListener) {},
    _removeListener(_key: string, _listener: StorageEventListener) {},
    _shouldAllowMigration: shouldAllowMigration
  };

  const stub = sinon.stub(persistence);
  return { persistence, stub };
}

describe('core/persistence/persistence_user_manager', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  describe('.create', () => {
    it('defaults to inMemory if no list provided', async () => {
      const manager = await PersistenceUserManager.create(auth, []);
      expect(manager.persistence).to.eq(_getInstance(inMemoryPersistence));
    });

    it('chooses the first one with a user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      a.stub._isAvailable.resolves(false);
      a.stub._get.onFirstCall().resolves(testUser(auth, 'uid').toJSON());
      b.stub._isAvailable.resolves(true);
      a.stub._get.onFirstCall().resolves(testUser(auth, 'uid-b').toJSON());

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._isAvailable).to.have.been.calledOnce;
      expect(b.stub._isAvailable).to.have.been.calledOnce;
      expect(c.stub._isAvailable).to.have.been.calledOnce;

      // a should not be chosen since it is not available (despite having a user).
      expect(out.persistence).to.eq(a.persistence);
    });

    it('defaults to first available persistence if no user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      a.stub._isAvailable.resolves(false);
      b.stub._isAvailable.resolves(true);
      c.stub._isAvailable.resolves(true);

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._isAvailable).to.have.been.calledOnce;
      expect(b.stub._isAvailable).to.have.been.calledOnce;
      expect(c.stub._isAvailable).to.have.been.calledOnce;

      // a should not be chosen since it is not available (despite having a user).
      expect(out.persistence).to.eq(b.persistence);
    });

    it('searches in order for a user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      const user = testUser(auth, 'uid');
      a.stub._isAvailable.resolves(true);
      a.stub._get.resolves(user.toJSON());
      b.stub._get.resolves(testUser(auth, 'wrong-uid').toJSON());

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._get).to.have.been.calledOnce;
      expect(b.stub._get).not.to.have.been.called;
      expect(c.stub._get).not.to.have.been.called;

      expect(out.persistence).to.eq(a.persistence);
      expect((await out.getCurrentUser())!.uid).to.eq(user.uid);
    });

    it('migrate found user to higher order persistence, if applicable', async () => {
      const a = makePersistence(PersistenceType.NONE, true);
      const b = makePersistence(PersistenceType.NONE, true);
      const c = makePersistence(PersistenceType.NONE, true);
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      const user = testUser(auth, 'uid');
      a.stub._isAvailable.resolves(true);
      b.stub._isAvailable.resolves(true);
      c.stub._isAvailable.resolves(true);
      b.stub._get.resolves(user.toJSON());
      c.stub._get.resolves(testUser(auth, 'wrong-uid').toJSON());

      let persistedUserInA: PersistenceValue | null = null;
      a.stub._set.callsFake(async (_, value) => {
        persistedUserInA = value;
      });
      a.stub._get.callsFake(async () => persistedUserInA);

      const out = await PersistenceUserManager.create(auth, search);
      expect(a.stub._set).to.have.been.calledOnceWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(b.stub._set).to.not.have.been.called;
      expect(c.stub._set).to.not.have.been.called;
      expect(b.stub._remove).to.have.been.calledOnceWith(
        'firebase:authUser:test-api-key:test-app'
      );
      expect(c.stub._remove).to.have.been.calledOnceWith(
        'firebase:authUser:test-api-key:test-app'
      );

      expect(out.persistence).to.eq(a.persistence);
      expect((await out.getCurrentUser())!.uid).to.eq(user.uid);
    });

    it('migrate found user to available persistence, if applicable', async () => {
      const a = makePersistence(PersistenceType.NONE, true);
      const b = makePersistence(PersistenceType.NONE, true);
      const c = makePersistence(PersistenceType.NONE, true);
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      const user = testUser(auth, 'uid');
      a.stub._isAvailable.resolves(false); // Important
      b.stub._isAvailable.resolves(true);
      c.stub._isAvailable.resolves(true);
      a.stub._get.resolves(user.toJSON());
      c.stub._get.resolves(testUser(auth, 'wrong-uid').toJSON());

      let persistedUserInB: PersistenceValue | null = null;
      b.stub._set.callsFake(async (_, value) => {
        persistedUserInB = value;
      });
      b.stub._get.callsFake(async () => persistedUserInB);

      const out = await PersistenceUserManager.create(auth, search);
      expect(b.stub._set).to.have.been.calledOnceWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(a.stub._set).to.not.have.been.called;
      expect(c.stub._set).to.not.have.been.called;
      expect(a.stub._remove).to.have.been.calledOnceWith(
        'firebase:authUser:test-api-key:test-app'
      );
      expect(c.stub._remove).to.have.been.calledOnceWith(
        'firebase:authUser:test-api-key:test-app'
      );

      expect(out.persistence).to.eq(b.persistence);
      expect((await out.getCurrentUser())!.uid).to.eq(user.uid);
    });

    it('uses default user key if none provided', async () => {
      const { stub, persistence } = makePersistence();
      stub._isAvailable.resolves(true);
      await PersistenceUserManager.create(auth, [persistence]);
      expect(stub._get).to.have.been.calledWith(
        'firebase:authUser:test-api-key:test-app'
      );
    });

    it('uses user key if provided', async () => {
      const { stub, persistence } = makePersistence();
      stub._isAvailable.resolves(true);
      await PersistenceUserManager.create(
        auth,
        [persistence],
        KeyName.REDIRECT_USER
      );
      expect(stub._get).to.have.been.calledWith(
        'firebase:redirectUser:test-api-key:test-app'
      );
    });

    it('returns in-memory persistence if all else fails', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      a.stub._isAvailable.resolves(false);
      b.stub._isAvailable.resolves(false);
      c.stub._isAvailable.resolves(false);

      const out = await PersistenceUserManager.create(auth, search);
      expect(out.persistence).to.eq(_getInstance(inMemoryPersistence));
      expect(a.stub._get).to.have.been.calledOnce;
      expect(b.stub._get).to.have.been.calledOnce;
      expect(c.stub._get).to.have.been.calledOnce;
    });
  });

  describe('manager methods', () => {
    let persistenceStub: sinon.SinonStubbedInstance<PersistenceInternal>;
    let manager: PersistenceUserManager;

    beforeEach(async () => {
      const { persistence, stub } = makePersistence(PersistenceType.SESSION);
      stub._isAvailable.resolves(true);
      persistenceStub = stub;
      manager = await PersistenceUserManager.create(auth, [persistence]);
    });

    it('#setCurrentUser calls underlying persistence w/ key', async () => {
      const user = testUser(auth, 'uid');
      await manager.setCurrentUser(user);
      expect(persistenceStub._set).to.have.been.calledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
    });

    it('#removeCurrentUser calls underlying persistence', async () => {
      await manager.removeCurrentUser();
      expect(persistenceStub._remove).to.have.been.calledWith(
        'firebase:authUser:test-api-key:test-app'
      );
    });

    it('#getCurrentUser calls with instantiator', async () => {
      const rawObject = {};
      const userImplStub = sinon.stub(UserImpl, '_fromJSON');
      persistenceStub._get.returns(Promise.resolve(rawObject));

      await manager.getCurrentUser();
      expect(userImplStub).to.have.been.calledWith(auth, rawObject);

      userImplStub.restore();
    });

    it('#savePersistenceForRedirect calls through', async () => {
      await manager.savePersistenceForRedirect();
      expect(persistenceStub._set).to.have.been.calledWith(
        'firebase:persistence:test-api-key:test-app',
        'SESSION'
      );
    });

    describe('#setPersistence', () => {
      it('returns immediately if persistence is not changed', async () => {
        const spy = sinon.spy(manager, 'getCurrentUser');
        await manager.setPersistence(manager.persistence);
        expect(spy).not.to.have.been.called;
        spy.restore();
      });

      it('removes current user & sets it in the new persistence', async () => {
        const { persistence: nextPersistence, stub: nextStub } =
          makePersistence();
        const auth = await testAuth();
        const user = testUser(auth, 'uid');
        persistenceStub._get.returns(Promise.resolve(user.toJSON()));

        await manager.setPersistence(nextPersistence);
        expect(persistenceStub._get).to.have.been.called;
        expect(persistenceStub._remove).to.have.been.called;
        expect(nextStub._set).to.have.been.calledWith(
          'firebase:authUser:test-api-key:test-app',
          user.toJSON()
        );
      });

      it('migrates user for a different persistence even if .type matches', async () => {
        const { persistence, stub } = makePersistence(PersistenceType.LOCAL);
        await manager.setPersistence(persistence);
        const auth = await testAuth();
        const user = testUser(auth, 'uid');
        stub._get.returns(Promise.resolve(user.toJSON()));

        const { persistence: nextPersistence, stub: nextStub } =
          makePersistence(PersistenceType.LOCAL);

        // This should migrate the user even if both has type LOCAL. For example, developer may want
        // to switch from localStorage to indexedDB (both type LOCAL) and we should honor that.
        await manager.setPersistence(nextPersistence);
        expect(stub._get).to.have.been.called;
        expect(stub._remove).to.have.been.called;
        expect(nextStub._set).to.have.been.calledWith(
          'firebase:authUser:test-api-key:test-app',
          user.toJSON()
        );
      });
    });
  });
});

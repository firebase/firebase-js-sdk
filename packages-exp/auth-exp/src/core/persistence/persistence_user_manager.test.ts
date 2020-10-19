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
import * as sinonChai from 'sinon-chai';

import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import { UserImpl } from '../user/user_impl';
import { _getInstance } from '../util/instantiator';
import { Persistence, PersistenceType, StorageEventListener } from './';
import { inMemoryPersistence } from './in_memory';
import { PersistenceUserManager } from './persistence_user_manager';

chai.use(sinonChai);

function makePersistence(
  type = PersistenceType.NONE
): {
  persistence: Persistence;
  stub: sinon.SinonStubbedInstance<Persistence>;
} {
  const persistence: Persistence = {
    type,
    _isAvailable: () => Promise.resolve(true),
    _set: async () => {},
    _get() {
      return Promise.resolve(null);
    },
    _remove: async () => {},
    _addListener(_key: string, _listener: StorageEventListener) {},
    _removeListener(_key: string, _listener: StorageEventListener) {}
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

    it('searches in order for a user', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const auth = await testAuth();
      b.stub._get.returns(Promise.resolve(testUser(auth, 'uid').toJSON()));

      const out = await PersistenceUserManager.create(auth, search);
      expect(out.persistence).to.eq(b.persistence);
      expect(a.stub._get).to.have.been.calledOnce;
      expect(b.stub._get).to.have.been.calledOnce;
      expect(c.stub._get).not.to.have.been.called;
    });

    it('uses default user key if none provided', async () => {
      const { stub, persistence } = makePersistence();
      await PersistenceUserManager.create(auth, [persistence]);
      expect(stub._get).to.have.been.calledWith(
        'firebase:authUser:test-api-key:test-app'
      );
    });

    it('uses user key if provided', async () => {
      const { stub, persistence } = makePersistence();
      await PersistenceUserManager.create(auth, [persistence], 'redirectUser');
      expect(stub._get).to.have.been.calledWith(
        'firebase:redirectUser:test-api-key:test-app'
      );
    });

    it('returns zeroth persistence if all else fails', async () => {
      const a = makePersistence();
      const b = makePersistence();
      const c = makePersistence();
      const search = [a.persistence, b.persistence, c.persistence];
      const out = await PersistenceUserManager.create(auth, search);
      expect(out.persistence).to.eq(a.persistence);
      expect(a.stub._get).to.have.been.calledOnce;
      expect(b.stub._get).to.have.been.calledOnce;
      expect(c.stub._get).to.have.been.called;
    });
  });

  describe('manager methods', () => {
    let persistenceStub: sinon.SinonStubbedInstance<Persistence>;
    let manager: PersistenceUserManager;

    beforeEach(async () => {
      const { persistence, stub } = makePersistence(PersistenceType.SESSION);
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
      it('returns immediately if types match', async () => {
        const { persistence: nextPersistence } = makePersistence(
          PersistenceType.SESSION
        );
        const spy = sinon.spy(manager, 'getCurrentUser');
        await manager.setPersistence(nextPersistence);
        expect(spy).not.to.have.been.called;
        spy.restore();
      });

      it('removes current user & sets it in the new persistene', async () => {
        const {
          persistence: nextPersistence,
          stub: nextStub
        } = makePersistence();
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
    });
  });
});

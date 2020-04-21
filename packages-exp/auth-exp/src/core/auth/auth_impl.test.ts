/**
 * @license
 * Copyright 2020 Google LLC
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

import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FirebaseApp } from '@firebase/app-types-exp';
import { FirebaseError } from '@firebase/util';

import { testUser } from '../../../test/mock_auth';
import { Auth } from '../../model/auth';
import { Persistence } from '../persistence';
import { browserLocalPersistence } from '../persistence/browser';
import { inMemoryPersistence } from '../persistence/in_memory';
import { PersistenceUserManager } from '../persistence/persistence_user_manager';
import { ClientPlatform, getClientVersion } from '../util/version';
import {
  DEFAULT_API_HOST,
  DEFAULT_API_SCHEME,
  initializeAuth
} from './auth_impl';

use(sinonChai);

const FAKE_APP: FirebaseApp = {
  name: 'test-app',
  options: {
    apiKey: 'api-key',
    authDomain: 'auth-domain'
  },
  automaticDataCollectionEnabled: false
};

describe('AuthImpl', () => {
  let auth: Auth;
  let persistenceStub: sinon.SinonStubbedInstance<Persistence>;

  beforeEach(() => {
    persistenceStub = sinon.stub(inMemoryPersistence);
    auth = initializeAuth(FAKE_APP, { persistence: inMemoryPersistence });
  });

  afterEach(sinon.restore);

  describe('#updateCurrentUser', () => {
    it('sets the field on the auth object', async () => {
      const user = testUser('uid');
      await auth.updateCurrentUser(user);
      expect(auth.currentUser).to.eql(user);
    });

    it('orders async operations correctly', async () => {
      const users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        return testUser(`${n}`);
      });

      persistenceStub.set.callsFake(() => {
        return new Promise(resolve => {
          // Force into the async flow to make this test actually meaningful
          setTimeout(() => resolve(), 1);
        });
      });

      await Promise.all(users.map(u => auth.updateCurrentUser(u)));
      for (let i = 0; i < 10; i++) {
        expect(persistenceStub.set.getCall(i)).to.have.been.calledWith(
          sinon.match.any,
          users[i].toPlainObject()
        );
      }
    });

    it('setting to null triggers a remove call', async () => {
      await auth.updateCurrentUser(null);
      expect(persistenceStub.remove).to.have.been.called;
    });
  });

  describe('#signOut', () => {
    it('sets currentUser to null, calls remove', async () => {
      await auth.updateCurrentUser(testUser('test'));
      await auth.signOut();
      expect(persistenceStub.remove).to.have.been.called;
      expect(auth.currentUser).to.be.null;
    });
  });

  describe('#setPersistence', () => {
    it('swaps underlying persistence', async () => {
      const newPersistence = browserLocalPersistence;
      const newStub = sinon.stub(newPersistence);
      persistenceStub.get.returns(
        Promise.resolve(testUser('test').toPlainObject())
      );

      await auth.setPersistence(newPersistence);
      expect(persistenceStub.get).to.have.been.called;
      expect(persistenceStub.remove).to.have.been.called;
      expect(newStub.set).to.have.been.calledWith(
        sinon.match.any,
        testUser('test').toPlainObject()
      );
    });
  });
});

describe('initializeAuth', () => {
  afterEach(sinon.restore);

  it('throws an API error if key not provided', () => {
    expect(() =>
      initializeAuth({
        ...FAKE_APP,
        options: {} // apiKey is missing
      })
    ).to.throw(
      FirebaseError,
      'Firebase: Your API key is invalid, please check you have copied it correctly. (auth/invalid-api-key).'
    );
  });

  describe('persistence manager creation', () => {
    let createManagerStub: sinon.SinonSpy;
    beforeEach(() => {
      createManagerStub = sinon.spy(PersistenceUserManager, 'create');
    });

    async function initAndWait(
      persistence: Persistence | Persistence[]
    ): Promise<Auth> {
      const auth = initializeAuth(FAKE_APP, { persistence });
      // Auth initializes async. We can make sure the initialization is
      // flushed by awaiting a method on the queue.
      await auth.setPersistence(inMemoryPersistence);
      return auth;
    }

    it('converts single persistence to array', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(createManagerStub).to.have.been.calledWith(auth, [
        inMemoryPersistence
      ]);
    });

    it('pulls the user from storage', async () => {
      sinon
        .stub(inMemoryPersistence, 'get')
        .returns(Promise.resolve(testUser('uid').toPlainObject()));
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.currentUser!.uid).to.eq('uid');
    });

    it('calls create with the persistence in order', async () => {
      const auth = await initAndWait([
        inMemoryPersistence,
        browserLocalPersistence
      ]);
      expect(createManagerStub).to.have.been.calledWith(auth, [
        inMemoryPersistence,
        browserLocalPersistence
      ]);
    });

    it('sets auth name and config', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.name).to.eq(FAKE_APP.name);
      expect(auth.config).to.eql({
        apiKey: FAKE_APP.options.apiKey,
        authDomain: FAKE_APP.options.authDomain,
        apiHost: DEFAULT_API_HOST,
        apiScheme: DEFAULT_API_SCHEME,
        sdkClientVersion: getClientVersion(ClientPlatform.BROWSER)
      });
    });
  });
});

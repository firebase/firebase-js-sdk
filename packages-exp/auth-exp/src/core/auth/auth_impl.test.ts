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
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FirebaseApp } from '@firebase/app-types-exp';
import { FirebaseError } from '@firebase/util';

import { endpointUrl, mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import { Persistence } from '../persistence';
import { inMemoryPersistence } from '../persistence/in_memory';
import { _getInstance } from '../util/instantiator';
import * as navigator from '../util/navigator';
import {
  _castAuth,
  AuthImpl,
  DEFAULT_API_HOST,
  DEFAULT_API_SCHEME,
  DEFAULT_TOKEN_API_HOST
} from './auth_impl';
import { _initializeAuthInstance } from './initialize';

use(sinonChai);
use(chaiAsPromised);

const FAKE_APP: FirebaseApp = {
  name: 'test-app',
  options: {
    apiKey: 'api-key',
    authDomain: 'auth-domain'
  },
  automaticDataCollectionEnabled: false
};

describe('core/auth/auth_impl', () => {
  let auth: Auth;
  let persistenceStub: sinon.SinonStubbedInstance<Persistence>;

  beforeEach(async () => {
    persistenceStub = sinon.stub(_getInstance(inMemoryPersistence));
    const authImpl = new AuthImpl(FAKE_APP, {
      apiKey: FAKE_APP.options.apiKey!,
      apiHost: DEFAULT_API_HOST,
      apiScheme: DEFAULT_API_SCHEME,
      tokenApiHost: DEFAULT_TOKEN_API_HOST,
      sdkClientVersion: 'v'
    });

    _initializeAuthInstance(authImpl, { persistence: inMemoryPersistence });
    auth = authImpl;
  });

  afterEach(sinon.restore);

  describe('#updateCurrentUser', () => {
    it('sets the field on the auth object', async () => {
      const user = testUser(auth, 'uid');
      await auth.updateCurrentUser(user);
      expect(auth.currentUser).to.eql(user);
    });

    it('orders async operations correctly', async () => {
      const users = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        return testUser(auth, `${n}`);
      });

      persistenceStub._set.callsFake(() => {
        return new Promise(resolve => {
          // Force into the async flow to make this test actually meaningful
          setTimeout(() => resolve(), 1);
        });
      });

      await Promise.all(users.map(u => auth.updateCurrentUser(u)));
      for (let i = 0; i < 10; i++) {
        expect(persistenceStub._set.getCall(i)).to.have.been.calledWith(
          sinon.match.any,
          users[i].toJSON()
        );
      }
    });

    it('setting to null triggers a remove call', async () => {
      await auth.updateCurrentUser(null);
      expect(persistenceStub._remove).to.have.been.called;
    });

    it('should throw an error if the user is from a different tenant', async () => {
      const user = testUser(auth, 'uid');
      user.tenantId = 'other-tenant-id';
      await expect(auth.updateCurrentUser(user)).to.be.rejectedWith(
        FirebaseError,
        '(auth/tenant-id-mismatch)'
      );
    });
  });

  describe('#signOut', () => {
    it('sets currentUser to null, calls remove', async () => {
      await auth.updateCurrentUser(testUser(auth, 'test'));
      await auth.signOut();
      expect(persistenceStub._remove).to.have.been.called;
      expect(auth.currentUser).to.be.null;
    });
  });

  describe('#useDeviceLanguage', () => {
    it('should update the language code', () => {
      const mock = sinon.stub(navigator, '_getUserLanguage');
      mock.callsFake(() => 'jp');
      expect(auth.languageCode).to.be.null;
      auth.useDeviceLanguage();
      expect(auth.languageCode).to.eq('jp');
    });
  });

  describe('change listeners', () => {
    // // Helpers to convert auth state change results to promise
    // function onAuthStateChange(callback: NextFn<User|null>)

    it('immediately calls authStateChange if initialization finished', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = true;
      auth.onAuthStateChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('waits for initialization for authStateChange', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = false;
      auth.onAuthStateChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('immediately calls idTokenChange if initialization finished', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = true;
      auth.onIdTokenChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('waits for initialization for idTokenChanged', done => {
      const user = testUser(auth, 'uid');
      auth.currentUser = user;
      auth._isInitialized = false;
      auth.onIdTokenChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('immediate callback is done async', () => {
      auth._isInitialized = true;
      let callbackCalled = false;
      auth.onIdTokenChanged(() => {
        callbackCalled = true;
      });

      expect(callbackCalled).to.be.false;
    });

    describe('user logs in/out, tokens refresh', () => {
      let user: User;
      let authStateCallback: sinon.SinonSpy;
      let idTokenCallback: sinon.SinonSpy;

      beforeEach(() => {
        user = testUser(auth, 'uid');
        authStateCallback = sinon.spy();
        idTokenCallback = sinon.spy();
      });

      context('initially currentUser is null', () => {
        beforeEach(async () => {
          auth.onAuthStateChanged(authStateCallback);
          auth.onIdTokenChanged(idTokenCallback);
          await auth.updateCurrentUser(null);
          authStateCallback.resetHistory();
          idTokenCallback.resetHistory();
        });

        it('onAuthStateChange triggers on log in', async () => {
          await auth.updateCurrentUser(user);
          expect(authStateCallback).to.have.been.calledWith(user);
        });

        it('onIdTokenChange triggers on log in', async () => {
          await auth.updateCurrentUser(user);
          expect(idTokenCallback).to.have.been.calledWith(user);
        });
      });

      context('initially currentUser is user', () => {
        beforeEach(async () => {
          auth.onAuthStateChanged(authStateCallback);
          auth.onIdTokenChanged(idTokenCallback);
          await auth.updateCurrentUser(user);
          authStateCallback.resetHistory();
          idTokenCallback.resetHistory();
        });

        it('onAuthStateChange triggers on log out', async () => {
          await auth.updateCurrentUser(null);
          expect(authStateCallback).to.have.been.calledWith(null);
        });

        it('onIdTokenChange triggers on log out', async () => {
          await auth.updateCurrentUser(null);
          expect(idTokenCallback).to.have.been.calledWith(null);
        });

        it('onAuthStateChange does not trigger for user props change', async () => {
          user.photoURL = 'blah';
          await auth.updateCurrentUser(user);
          expect(authStateCallback).not.to.have.been.called;
        });

        it('onIdTokenChange triggers for user props change', async () => {
          user.photoURL = 'hey look I changed';
          await auth.updateCurrentUser(user);
          expect(idTokenCallback).to.have.been.calledWith(user);
        });

        it('onAuthStateChange triggers if uid changes', async () => {
          const newUser = testUser(auth, 'different-uid');
          await auth.updateCurrentUser(newUser);
          expect(authStateCallback).to.have.been.calledWith(newUser);
        });
      });

      it('onAuthStateChange works for multiple listeners', async () => {
        const cb1 = sinon.spy();
        const cb2 = sinon.spy();
        auth.onAuthStateChanged(cb1);
        auth.onAuthStateChanged(cb2);
        await auth.updateCurrentUser(null);
        cb1.resetHistory();
        cb2.resetHistory();

        await auth.updateCurrentUser(user);
        expect(cb1).to.have.been.calledWith(user);
        expect(cb2).to.have.been.calledWith(user);
      });

      it('onIdTokenChange works for multiple listeners', async () => {
        const cb1 = sinon.spy();
        const cb2 = sinon.spy();
        auth.onIdTokenChanged(cb1);
        auth.onIdTokenChanged(cb2);
        await auth.updateCurrentUser(null);
        cb1.resetHistory();
        cb2.resetHistory();

        await auth.updateCurrentUser(user);
        expect(cb1).to.have.been.calledWith(user);
        expect(cb2).to.have.been.calledWith(user);
      });
    });
  });

  describe('#_onStorageEvent', () => {
    let authStateCallback: sinon.SinonSpy;
    let idTokenCallback: sinon.SinonSpy;

    beforeEach(async () => {
      authStateCallback = sinon.spy();
      idTokenCallback = sinon.spy();
      auth.onAuthStateChanged(authStateCallback);
      auth.onIdTokenChanged(idTokenCallback);
      await auth.updateCurrentUser(null); // force event handlers to clear out
      authStateCallback.resetHistory();
      idTokenCallback.resetHistory();
    });

    context('previously logged out', () => {
      context('still logged out', () => {
        it('should do nothing', async () => {
          await auth._onStorageEvent();

          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).not.to.have.been.called;
        });
      });

      context('now logged in', () => {
        let user: User;

        beforeEach(() => {
          user = testUser(auth, 'uid');
          persistenceStub._get.returns(Promise.resolve(user.toJSON()));
        });

        it('should update the current user', async () => {
          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).to.eql(user.toJSON());
          expect(authStateCallback).to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
        });
      });
    });

    context('previously logged in', () => {
      let user: User;

      beforeEach(async () => {
        user = testUser(auth, 'uid', undefined, true);
        await auth.updateCurrentUser(user);
        authStateCallback.resetHistory();
        idTokenCallback.resetHistory();
      });

      context('now logged out', () => {
        beforeEach(() => {
          persistenceStub._get.returns(Promise.resolve(null));
        });

        it('should log out', async () => {
          await auth._onStorageEvent();

          expect(auth.currentUser).to.be.null;
          expect(authStateCallback).to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
        });
      });

      context('still logged in as same user', () => {
        it('should do nothing if nothing changed', async () => {
          persistenceStub._get.returns(Promise.resolve(user.toJSON()));

          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).to.eql(user.toJSON());
          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).not.to.have.been.called;
        });

        it('should update fields if they have changed', async () => {
          const userObj = user.toJSON();
          userObj['displayName'] = 'other-name';
          persistenceStub._get.returns(Promise.resolve(userObj));

          await auth._onStorageEvent();

          expect(auth.currentUser?.uid).to.eq(user.uid);
          expect(auth.currentUser?.displayName).to.eq('other-name');
          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).not.to.have.been.called;
        });

        it('should update tokens if they have changed', async () => {
          const userObj = user.toJSON();
          (userObj['stsTokenManager'] as any)['accessToken'] =
            'new-access-token';
          persistenceStub._get.returns(Promise.resolve(userObj));

          await auth._onStorageEvent();

          expect(auth.currentUser?.uid).to.eq(user.uid);
          expect((auth.currentUser as User)?.stsTokenManager.accessToken).to.eq(
            'new-access-token'
          );
          expect(authStateCallback).not.to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
        });
      });

      context('now logged in as different user', () => {
        it('should re-login as the new user', async () => {
          const newUser = testUser(auth, 'other-uid', undefined, true);
          persistenceStub._get.returns(Promise.resolve(newUser.toJSON()));

          await auth._onStorageEvent();

          expect(auth.currentUser?.toJSON()).to.eql(newUser.toJSON());
          expect(authStateCallback).to.have.been.called;
          expect(idTokenCallback).to.have.been.called;
        });
      });
    });
  });
});

// These tests are separate because they are using a different auth with
// separate setup and config
describe('core/auth/auth_impl useEmulator', () => {
  let auth: TestAuth;
  let user: User;
  let normalEndpoint: fetch.Route;
  let emulatorEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(_castAuth(auth), 'uid', 'email', true);
    fetch.setUp();
    normalEndpoint = mockEndpoint(Endpoint.DELETE_ACCOUNT, {});
    emulatorEndpoint = fetch.mock(
      `http://localhost:2020/${endpointUrl(Endpoint.DELETE_ACCOUNT).replace(
        /^.*:\/\//,
        ''
      )}`,
      {}
    );
  });

  afterEach(() => {
    fetch.tearDown();
  });

  context('useEmulator', () => {
    it('fails if a network request has already been made', async () => {
      await user.delete();
      expect(() => auth.useEmulator('http://localhost:2020')).to.throw(
        FirebaseError,
        'auth/emulator-config-failed'
      );
    });

    it('updates the endpoint appropriately', async () => {
      auth.useEmulator('http://localhost:2020');
      await user.delete();
      expect(normalEndpoint.calls.length).to.eq(0);
      expect(emulatorEndpoint.calls.length).to.eq(1);
    });
  });

  context('toJSON', () => {
    it('works when theres no current user', () => {
      expect(JSON.stringify(auth)).to.eq(
        '{"apiKey":"test-api-key","authDomain":"localhost","appName":"test-app"}'
      );
    });

    it('also stringifies the current user', () => {
      auth.currentUser = ({
        toJSON: (): object => ({ foo: 'bar' })
      } as unknown) as User;
      expect(JSON.stringify(auth)).to.eq(
        '{"apiKey":"test-api-key","authDomain":"localhost",' + '"appName":"test-app","currentUser":{"foo":"bar"}}'
      );
    });
  });
});

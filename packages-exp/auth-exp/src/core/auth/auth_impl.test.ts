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
import * as externs from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { testUser } from '../../../test/helpers/mock_auth';
import { User } from '../../model/user';
import { browserPopupRedirectResolver } from '../../platform_browser/popup_redirect';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { Persistence } from '../persistence';
import {
  browserLocalPersistence,
  browserSessionPersistence
} from '../persistence/browser';
import { inMemoryPersistence } from '../persistence/in_memory';
import { PersistenceUserManager } from '../persistence/persistence_user_manager';
import * as reload from '../user/reload';
import { _getInstance } from '../util/instantiator';
import * as navigator from '../util/navigator';
import { _getClientVersion, ClientPlatform } from '../util/version';
import {
  DEFAULT_API_HOST,
  DEFAULT_API_SCHEME,
  DEFAULT_TOKEN_API_HOST,
  _castAuth,
  _initializeAuthForClientPlatform
} from './auth_impl';

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

const initializeAuth = _initializeAuthForClientPlatform(ClientPlatform.BROWSER);

describe('core/auth/auth_impl', () => {
  let auth: externs.Auth;
  let persistenceStub: sinon.SinonStubbedInstance<Persistence>;

  beforeEach(() => {
    persistenceStub = sinon.stub(_getInstance(inMemoryPersistence));
    auth = initializeAuth(FAKE_APP, {
      persistence: inMemoryPersistence
    });
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
      expect(persistenceStub.remove).to.have.been.called;
      expect(auth.currentUser).to.be.null;
    });
  });

  describe('#setPersistence', () => {
    it('swaps underlying persistence', async () => {
      const newPersistence = browserLocalPersistence;
      const newStub = sinon.stub(_getInstance<Persistence>(newPersistence));
      persistenceStub.get.returns(
        Promise.resolve(testUser(auth, 'test').toPlainObject())
      );

      await auth.setPersistence(newPersistence);
      expect(persistenceStub.get).to.have.been.called;
      expect(persistenceStub.remove).to.have.been.called;
      expect(newStub.set).to.have.been.calledWith(
        sinon.match.any,
        testUser(auth, 'test').toPlainObject()
      );
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
      _castAuth(auth).currentUser = user;
      _castAuth(auth)._isInitialized = true;
      auth.onAuthStateChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('immediately calls idTokenChange if initialization finished', done => {
      const user = testUser(auth, 'uid');
      _castAuth(auth).currentUser = user;
      _castAuth(auth)._isInitialized = true;
      auth.onIdTokenChanged(user => {
        expect(user).to.eq(user);
        done();
      });
    });

    it('immediate callback is done async', () => {
      _castAuth(auth)._isInitialized = true;
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
});

describe('core/auth/initializeAuth', () => {
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
    let reloadStub: sinon.SinonStub;

    beforeEach(() => {
      createManagerStub = sinon.spy(PersistenceUserManager, 'create');
      reloadStub = sinon
        .stub(reload, '_reloadWithoutSaving')
        .returns(Promise.resolve());
    });

    async function initAndWait(
      persistence: externs.Persistence | externs.Persistence[],
      popupRedirectResolver?: externs.PopupRedirectResolver
    ): Promise<externs.Auth> {
      const auth = initializeAuth(FAKE_APP, {
        persistence,
        popupRedirectResolver
      });
      // Auth initializes async. We can make sure the initialization is
      // flushed by awaiting a method on the queue.
      await auth.setPersistence(inMemoryPersistence);
      return auth;
    }

    it('converts single persistence to array', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(createManagerStub).to.have.been.calledWith(auth, [
        _getInstance(inMemoryPersistence)
      ]);
    });

    it('pulls the user from storage', async () => {
      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), 'get')
        .returns(Promise.resolve(testUser({}, 'uid').toPlainObject()));
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.currentUser!.uid).to.eq('uid');
    });

    it('calls create with the persistence in order', async () => {
      const auth = await initAndWait([
        inMemoryPersistence,
        browserLocalPersistence
      ]);
      expect(createManagerStub).to.have.been.calledWith(auth, [
        _getInstance(inMemoryPersistence),
        _getInstance(browserLocalPersistence)
      ]);
    });

    it('does not reload redirect users', async () => {
      const user = testUser({}, 'uid');
      user._redirectEventId = 'event-id';
      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), 'get')
        .returns(Promise.resolve(user.toPlainObject()));
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), 'get')
        .returns(Promise.resolve(user.toPlainObject()));
      await initAndWait(inMemoryPersistence);
      expect(reload._reloadWithoutSaving).not.to.have.been.called;
    });

    it('reloads non-redirect users', async () => {
      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), 'get')
        .returns(Promise.resolve(testUser({}, 'uid').toPlainObject()));
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), 'get')
        .returns(Promise.resolve(null));

      await initAndWait(inMemoryPersistence);
      expect(reload._reloadWithoutSaving).to.have.been.called;
    });

    it('Does not reload if the event ids match', async () => {
      const user = testUser({}, 'uid');
      user._redirectEventId = 'event-id';

      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), 'get')
        .returns(Promise.resolve(user.toPlainObject()));
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), 'get')
        .returns(Promise.resolve(user.toPlainObject()));

      await initAndWait(inMemoryPersistence, browserPopupRedirectResolver);
      expect(reload._reloadWithoutSaving).not.to.have.been.called;
    });

    it('Reloads if the event ids do not match', async () => {
      const user = testUser({}, 'uid');
      user._redirectEventId = 'event-id';

      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), 'get')
        .returns(Promise.resolve(user.toPlainObject()));

      user._redirectEventId = 'some-other-id';
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), 'get')
        .returns(Promise.resolve(user.toPlainObject()));

      await initAndWait(inMemoryPersistence, browserPopupRedirectResolver);
      expect(reload._reloadWithoutSaving).to.have.been.called;
    });

    it('Nulls out the current user if reload fails', async () => {
      const stub = sinon.stub(_getInstance<Persistence>(inMemoryPersistence));
      stub.get.returns(Promise.resolve(testUser({}, 'uid').toPlainObject()));
      stub.remove.returns(Promise.resolve());
      reloadStub.returns(
        Promise.reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.TOKEN_EXPIRED, {
            appName: 'app'
          })
        )
      );

      await initAndWait(inMemoryPersistence);
      expect(stub.remove).to.have.been.called;
    });

    it('Keeps current user if reload fails with network error', async () => {
      const stub = sinon.stub(_getInstance<Persistence>(inMemoryPersistence));
      stub.get.returns(Promise.resolve(testUser({}, 'uid').toPlainObject()));
      stub.remove.returns(Promise.resolve());
      reloadStub.returns(
        Promise.reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
            appName: 'app'
          })
        )
      );

      await initAndWait(inMemoryPersistence);
      expect(stub.remove).not.to.have.been.called;
    });

    it('sets auth name and config', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.name).to.eq(FAKE_APP.name);
      expect(auth.config).to.eql({
        apiKey: FAKE_APP.options.apiKey,
        authDomain: FAKE_APP.options.authDomain,
        apiHost: DEFAULT_API_HOST,
        apiScheme: DEFAULT_API_SCHEME,
        tokenApiHost: DEFAULT_TOKEN_API_HOST,
        sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
      });
    });
  });
});

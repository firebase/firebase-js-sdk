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

import { testAuth, testUser } from '../../test/helpers/mock_auth';
import { _castAuth, AuthImpl, DefaultConfig } from '../core/auth/auth_impl';
import { _initializeAuthInstance } from '../core/auth/initialize';
import { AuthErrorCode } from '../core/errors';
import { Persistence } from '../core/persistence';
import { browserLocalPersistence } from './persistence/local_storage';
import { browserSessionPersistence } from './persistence/session_storage';
import { inMemoryPersistence } from '../core/persistence/in_memory';
import { PersistenceUserManager } from '../core/persistence/persistence_user_manager';
import * as reload from '../core/user/reload';
import { _getInstance } from '../core/util/instantiator';
import { _getClientVersion, ClientPlatform } from '../core/util/version';
import { Auth } from '../model/auth';
import { browserPopupRedirectResolver } from './popup_redirect';
import { PopupRedirectResolver } from '../model/popup_redirect';
import { UserCredentialImpl } from '../core/user/user_credential_impl';
import { User } from '../model/user';
import { _createError } from '../core/util/assert';

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
      apiHost: DefaultConfig.API_HOST,
      apiScheme: DefaultConfig.API_SCHEME,
      tokenApiHost: DefaultConfig.TOKEN_API_HOST,
      sdkClientVersion: 'v'
    });

    _initializeAuthInstance(authImpl, { persistence: inMemoryPersistence });
    auth = authImpl;
  });

  afterEach(sinon.restore);

  describe('#setPersistence', () => {
    it('swaps underlying persistence', async () => {
      const newPersistence = browserLocalPersistence;
      const newStub = sinon.stub(_getInstance<Persistence>(newPersistence));
      persistenceStub._get.returns(
        Promise.resolve(testUser(auth, 'test').toJSON())
      );

      await auth.setPersistence(newPersistence);
      expect(persistenceStub._get).to.have.been.called;
      expect(persistenceStub._remove).to.have.been.called;
      expect(newStub._set).to.have.been.calledWith(
        sinon.match.any,
        testUser(auth, 'test').toJSON()
      );
    });
  });
});

describe('core/auth/initializeAuth', () => {
  afterEach(sinon.restore);

  describe('persistence manager creation', () => {
    let createManagerStub: sinon.SinonSpy;
    let reloadStub: sinon.SinonStub;
    let oldAuth: Auth;
    let completeRedirectFnStub: sinon.SinonStub;

    beforeEach(async () => {
      oldAuth = await testAuth();
      createManagerStub = sinon.spy(PersistenceUserManager, 'create');
      reloadStub = sinon
        .stub(reload, '_reloadWithoutSaving')
        .returns(Promise.resolve());
      completeRedirectFnStub = sinon
        .stub(
          _getInstance<PopupRedirectResolver>(browserPopupRedirectResolver),
          '_completeRedirectFn'
        )
        .returns(Promise.resolve(null));
    });

    async function initAndWait(
      persistence: externs.Persistence | externs.Persistence[],
      popupRedirectResolver?: externs.PopupRedirectResolver
    ): Promise<externs.Auth> {
      const auth = new AuthImpl(FAKE_APP, {
        apiKey: FAKE_APP.options.apiKey!,
        apiHost: DefaultConfig.API_HOST,
        apiScheme: DefaultConfig.API_SCHEME,
        tokenApiHost: DefaultConfig.TOKEN_API_HOST,
        authDomain: FAKE_APP.options.authDomain,
        sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
      });

      _initializeAuthInstance(auth, {
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
        .stub(_getInstance<Persistence>(inMemoryPersistence), '_get')
        .returns(Promise.resolve(testUser(oldAuth, 'uid').toJSON()));
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
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = 'event-id';
      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), '_get')
        .returns(Promise.resolve(user.toJSON()));
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), '_get')
        .returns(Promise.resolve(user.toJSON()));
      await initAndWait(inMemoryPersistence);
      expect(reload._reloadWithoutSaving).not.to.have.been.called;
    });

    it('reloads non-redirect users', async () => {
      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), '_get')
        .returns(Promise.resolve(testUser(oldAuth, 'uid').toJSON()));
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), '_get')
        .returns(Promise.resolve(null));

      await initAndWait(inMemoryPersistence);
      expect(reload._reloadWithoutSaving).to.have.been.called;
    });

    it('Does not reload if the event ids match', async () => {
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = 'event-id';

      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), '_get')
        .returns(Promise.resolve(user.toJSON()));
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), '_get')
        .returns(Promise.resolve(user.toJSON()));

      await initAndWait(inMemoryPersistence, browserPopupRedirectResolver);
      expect(reload._reloadWithoutSaving).not.to.have.been.called;
    });

    it('Reloads if the event ids do not match', async () => {
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = 'event-id';

      sinon
        .stub(_getInstance<Persistence>(inMemoryPersistence), '_get')
        .returns(Promise.resolve(user.toJSON()));

      user._redirectEventId = 'some-other-id';
      sinon
        .stub(_getInstance<Persistence>(browserSessionPersistence), '_get')
        .returns(Promise.resolve(user.toJSON()));

      await initAndWait(inMemoryPersistence, browserPopupRedirectResolver);
      expect(reload._reloadWithoutSaving).to.have.been.called;
    });

    it('Nulls out the current user if reload fails', async () => {
      const stub = sinon.stub(_getInstance<Persistence>(inMemoryPersistence));
      stub._get.returns(Promise.resolve(testUser(oldAuth, 'uid').toJSON()));
      stub._remove.returns(Promise.resolve());
      reloadStub.returns(
        Promise.reject(
          _createError(AuthErrorCode.TOKEN_EXPIRED, {
            appName: 'app'
          })
        )
      );

      await initAndWait(inMemoryPersistence);
      expect(stub._remove).to.have.been.called;
    });

    it('Keeps current user if reload fails with network error', async () => {
      const stub = sinon.stub(_getInstance<Persistence>(inMemoryPersistence));
      stub._get.returns(Promise.resolve(testUser(oldAuth, 'uid').toJSON()));
      stub._remove.returns(Promise.resolve());
      reloadStub.returns(
        Promise.reject(
          _createError(AuthErrorCode.NETWORK_REQUEST_FAILED, {
            appName: 'app'
          })
        )
      );

      await initAndWait(inMemoryPersistence);
      expect(stub._remove).not.to.have.been.called;
    });

    it('sets auth name and config', async () => {
      const auth = await initAndWait(inMemoryPersistence);
      expect(auth.name).to.eq(FAKE_APP.name);
      expect(auth.config).to.eql({
        apiKey: FAKE_APP.options.apiKey,
        authDomain: FAKE_APP.options.authDomain,
        apiHost: DefaultConfig.API_HOST,
        apiScheme: DefaultConfig.API_SCHEME,
        tokenApiHost: DefaultConfig.TOKEN_API_HOST,
        sdkClientVersion: _getClientVersion(ClientPlatform.BROWSER)
      });
    });

    context('#tryRedirectSignIn', () => {
      it('returns null and clears the redirect user in case of error', async () => {
        const stub = sinon.stub(
          _getInstance<Persistence>(browserSessionPersistence)
        );
        stub._remove.returns(Promise.resolve());
        completeRedirectFnStub.returns(Promise.reject(new Error('no')));

        await initAndWait([inMemoryPersistence], browserPopupRedirectResolver);
        expect(stub._remove).to.have.been.called;
      });

      it('signs in the redirect user if found', async () => {
        let user: User | null = null;
        completeRedirectFnStub.callsFake((auth: Auth) => {
          user = testUser(auth, 'uid', 'redirectUser@test.com');
          return Promise.resolve(
            new UserCredentialImpl({
              operationType: externs.OperationType.SIGN_IN,
              user,
              providerId: null
            })
          );
        });

        const auth = await initAndWait(
          [inMemoryPersistence],
          browserPopupRedirectResolver
        );
        expect(user).not.to.be.null;
        expect(auth.currentUser).to.eq(user);
      });
    });
  });
});

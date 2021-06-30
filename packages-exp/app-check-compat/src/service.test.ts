/**
 * @license
 * Copyright 2017 Google LLC
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
import { AppCheckService } from './service';
import { firebase, FirebaseApp } from '@firebase/app-compat';
import * as appCheckExp from '@firebase/app-check-exp';
import { stub, match, SinonStub } from 'sinon';
import * as sinonChai from 'sinon-chai';
import { CustomProvider, ReCaptchaV3Provider } from '@firebase/app-check-exp';
import { AppCheckTokenResult } from '../../../packages/app-check-types';
import { PartialObserver } from '../../../packages/util/dist';

use(sinonChai);

function createTestService(app: FirebaseApp): AppCheckService {
  return new AppCheckService(
    app,
    appCheckExp.initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('fake-site-key')
    })
  );
}

describe('Firebase App Check > Service', () => {
  let app: FirebaseApp;
  let service: AppCheckService;

  beforeEach(() => {
    app = firebase.initializeApp({
      apiKey: '456_LETTERS_AND_1234NUMBERS',
      appId: '123lettersand:numbers',
      projectId: 'my-project',
      messagingSenderId: 'messaging-sender-id'
    });
  });

  afterEach(async () => {
    await app.delete();
  });

  it(
    'activate("string") calls modular initializeAppCheck() with a ' +
      'ReCaptchaV3Provider',
    () => {
      const initializeAppCheckStub = stub(appCheckExp, 'initializeAppCheck');
      service = new AppCheckService(app, {} as appCheckExp.AppCheck);
      service.activate('my_site_key');
      expect(initializeAppCheckStub).to.be.calledWith(app, {
        provider: match.instanceOf(ReCaptchaV3Provider),
        isTokenAutoRefreshEnabled: undefined
      });
      initializeAppCheckStub.restore();
    }
  );

  it(
    'activate(CustomProvider) calls modular initializeAppCheck() with' +
      ' a CustomProvider',
    () => {
      const initializeAppCheckStub = stub(appCheckExp, 'initializeAppCheck');
      service = new AppCheckService(app, {} as appCheckExp.AppCheck);
      const customGetTokenStub = stub();
      service.activate({
        getToken: customGetTokenStub
      });
      expect(initializeAppCheckStub).to.be.calledWith(app, {
        provider: match
          .instanceOf(CustomProvider)
          .and(
            match.hasNested(
              '_customProviderOptions.getToken',
              customGetTokenStub
            )
          ),
        isTokenAutoRefreshEnabled: undefined
      });
      initializeAppCheckStub.restore();
    }
  );

  it('setTokenAutoRefreshEnabled() calls modular setTokenAutoRefreshEnabled()', () => {
    const setTokenAutoRefreshEnabledStub: SinonStub = stub(
      appCheckExp,
      'setTokenAutoRefreshEnabled'
    );
    service = createTestService(app);
    service.setTokenAutoRefreshEnabled(true);
    expect(setTokenAutoRefreshEnabledStub).to.be.calledWith(
      service._delegate,
      true
    );
    setTokenAutoRefreshEnabledStub.restore();
  });

  it('getToken() calls modular getToken()', async () => {
    service = createTestService(app);
    const getTokenStub = stub(appCheckExp, 'getToken');
    await service.getToken(true);
    expect(getTokenStub).to.be.calledWith(service._delegate, true);
    getTokenStub.restore();
  });

  it('onTokenChanged() calls modular onTokenChanged() with observer', () => {
    const onTokenChangedStub = stub(appCheckExp, 'onTokenChanged');
    service = createTestService(app);
    const observer: PartialObserver<AppCheckTokenResult> = {
      next: stub(),
      error: stub()
    };
    service.onTokenChanged(observer);
    expect(onTokenChangedStub).to.be.calledWith(service._delegate, observer);
    onTokenChangedStub.restore();
  });

  it('onTokenChanged() calls modular onTokenChanged() with next/error fns', () => {
    const onTokenChangedStub = stub(appCheckExp, 'onTokenChanged');
    service = createTestService(app);
    const nextFn = stub();
    const errorFn = stub();
    service.onTokenChanged(nextFn, errorFn);
    expect(onTokenChangedStub).to.be.calledWith(
      service._delegate,
      nextFn,
      errorFn
    );
    onTokenChangedStub.restore();
  });
});

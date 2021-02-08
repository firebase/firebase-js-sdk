/**
 * @license
 * Copyright 2021 Google LLC
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

import * as externs from '@firebase/auth-types-exp';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { SingletonInstantiator } from '../../core/util/instantiator';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { cordovaPopupRedirectResolver } from './popup_redirect';
import { GoogleAuthProvider } from '../../core/providers/google';
import * as utils from './utils';
import { FirebaseError } from '@firebase/util';

use(chaiAsPromised);
use(sinonChai);

describe('platform_cordova/popup_redirect/popup_redirect', () => {
  let auth: TestAuth;
  let resolver: PopupRedirectResolver;
  let provider: externs.AuthProvider;
  let utilsStubs: Record<keyof typeof utils, sinon.SinonStub>;

  beforeEach(async () => {
    auth = await testAuth();
    resolver = new (cordovaPopupRedirectResolver as SingletonInstantiator<PopupRedirectResolver>)();
    provider = new GoogleAuthProvider();
    utilsStubs = {
      _generateNewEvent: sinon.stub(utils, '_generateNewEvent'),
      _generateHandlerUrl: sinon.stub(utils, '_generateHandlerUrl'),
      _checkCordovaConfiguration: sinon.stub(
        utils,
        '_checkCordovaConfiguration'
      ),
      _performRedirect: sinon.stub(utils, '_performRedirect')
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('_openRedirect', () => {
    // The heavy-duty testing of the underlying configuration is in
    // platform_cordova/popup_redirect/utils.test.ts. These tests will check
    // primarily for the correct behavior using the values provided by the
    // utils.
    it('performs the redirect with the correct url after checking config', async () => {
      const event = {} as AuthEvent;
      utilsStubs._generateHandlerUrl.returns(
        Promise.resolve('https://localhost/__/auth/handler')
      );
      utilsStubs._performRedirect.returns(Promise.resolve());
      utilsStubs._generateNewEvent.returns(event);

      await resolver._openRedirect(
        auth,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT
      );
      expect(utilsStubs._checkCordovaConfiguration).to.have.been.called;
      expect(utilsStubs._generateHandlerUrl).to.have.been.calledWith(
        auth,
        event,
        provider
      );
      expect(utilsStubs._performRedirect).to.have.been.calledWith(
        'https://localhost/__/auth/handler'
      );
    });
  });

  describe('_openPopup', () => {
    it('throws an error', () => {
      expect(() =>
        resolver._openPopup(auth, provider, AuthEventType.LINK_VIA_POPUP)
      ).to.throw(
        FirebaseError,
        'auth/operation-not-supported-in-this-environment'
      );
    });
  });
});

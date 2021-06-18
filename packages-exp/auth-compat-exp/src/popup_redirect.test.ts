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
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as exp from '@firebase/auth-exp/internal';
import * as platform from './platform';
import { CompatPopupRedirectResolver } from './popup_redirect';
import { FirebaseApp } from '@firebase/app-compat';

use(sinonChai);

describe('popup_redirect/CompatPopupRedirectResolver', () => {
  let compatResolver: CompatPopupRedirectResolver;
  let auth: exp.AuthImpl;

  beforeEach(() => {
    compatResolver = new CompatPopupRedirectResolver();
    const app = { options: { apiKey: 'api-key' } } as FirebaseApp;
    auth = new exp.AuthImpl(app, {
      apiKey: 'api-key'
    } as exp.ConfigInternal);
  });

  afterEach(() => {
    sinon.restore();
  });

  context('initialization and resolver selection', () => {
    const browserResolver = exp._getInstance<exp.PopupRedirectResolverInternal>(
      exp.browserPopupRedirectResolver
    );
    const cordovaResolver = exp._getInstance<exp.PopupRedirectResolverInternal>(
      exp.cordovaPopupRedirectResolver
    );

    beforeEach(() => {
      sinon.stub(browserResolver, '_initialize');
      sinon.stub(cordovaResolver, '_initialize');
    });

    it('selects the Cordova resolver if in Cordova', async () => {
      sinon.stub(platform, '_isCordova').returns(Promise.resolve(true));
      await compatResolver._initialize(auth);
      expect(cordovaResolver._initialize).to.have.been.calledWith(auth);
      expect(browserResolver._initialize).not.to.have.been.called;
    });

    it('selects the Browser resolver if in Browser', async () => {
      sinon.stub(platform, '_isCordova').returns(Promise.resolve(false));
      await compatResolver._initialize(auth);
      expect(cordovaResolver._initialize).not.to.have.been.called;
      expect(browserResolver._initialize).to.have.been.calledWith(auth);
    });
  });

  context('callthrough methods', () => {
    let underlyingResolver: sinon.SinonStubbedInstance<exp.PopupRedirectResolverInternal>;
    let provider: exp.AuthProvider;

    beforeEach(() => {
      underlyingResolver = sinon.createStubInstance(FakeResolver);
      ((compatResolver as unknown) as {
        underlyingResolver: exp.PopupRedirectResolverInternal;
      }).underlyingResolver = underlyingResolver;
      provider = new exp.GoogleAuthProvider();
    });

    it('_openPopup', async () => {
      await compatResolver._openPopup(
        auth,
        provider,
        exp.AuthEventType.LINK_VIA_POPUP,
        'eventId'
      );
      expect(underlyingResolver._openPopup).to.have.been.calledWith(
        auth,
        provider,
        exp.AuthEventType.LINK_VIA_POPUP,
        'eventId'
      );
    });

    it('_openRedirect', async () => {
      await compatResolver._openRedirect(
        auth,
        provider,
        exp.AuthEventType.LINK_VIA_REDIRECT,
        'eventId'
      );
      expect(underlyingResolver._openRedirect).to.have.been.calledWith(
        auth,
        provider,
        exp.AuthEventType.LINK_VIA_REDIRECT,
        'eventId'
      );
    });

    it('_isIframeWebStorageSupported', () => {
      const cb = (): void => {};
      compatResolver._isIframeWebStorageSupported(auth, cb);
      expect(
        underlyingResolver._isIframeWebStorageSupported
      ).to.have.been.calledWith(auth, cb);
    });

    it('_originValidation', async () => {
      await compatResolver._originValidation(auth);
      expect(underlyingResolver._originValidation).to.have.been.calledWith(
        auth
      );
    });
  });

  context('_shouldInitProactively', () => {
    it('returns true if platform may be cordova', () => {
      sinon.stub(platform, '_isLikelyCordova').returns(true);
      expect(compatResolver._shouldInitProactively).to.be.true;
    });

    it('returns true if cordova is false but browser value is true', () => {
      sinon
        .stub(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            exp.browserPopupRedirectResolver
          ),
          '_shouldInitProactively'
        )
        .value(true);
      sinon.stub(platform, '_isLikelyCordova').returns(false);
      expect(compatResolver._shouldInitProactively).to.be.true;
    });

    it('returns false if not cordova and not browser early init', () => {
      sinon
        .stub(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            exp.browserPopupRedirectResolver
          ),
          '_shouldInitProactively'
        )
        .value(false);
      sinon.stub(platform, '_isLikelyCordova').returns(false);
      expect(compatResolver._shouldInitProactively).to.be.false;
    });
  });
});

class FakeResolver implements exp.PopupRedirectResolverInternal {
  _completeRedirectFn = async (): Promise<null> => null;
  _redirectPersistence = exp.inMemoryPersistence;
  _shouldInitProactively = true;

  _initialize(): Promise<exp.EventManager> {
    throw new Error('Method not implemented.');
  }
  _openPopup(): Promise<exp.AuthPopup> {
    throw new Error('Method not implemented.');
  }
  _openRedirect(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  _isIframeWebStorageSupported(): void {
    throw new Error('Method not implemented.');
  }

  _originValidation(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

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
  EventManager,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { CordovaAuthEventManager, cordovaPopupRedirectResolver } from './popup_redirect';
import { GoogleAuthProvider } from '../../core/providers/google';
import * as utils from './utils';
import * as events from './events';
import { FirebaseError } from '@firebase/util';
import { stubSingleTimeout, TimerTripFn } from '../../../test/helpers/timeout_stub';

use(chaiAsPromised);
use(sinonChai);

describe('platform_cordova/popup_redirect/popup_redirect', () => {
  let auth: TestAuth;
  let resolver: PopupRedirectResolver;
  let provider: externs.AuthProvider;
  let utilsStubs: sinon.SinonStubbedInstance<typeof utils>;
  let eventsStubs: sinon.SinonStubbedInstance<typeof events>;

  beforeEach(async () => {
    auth = await testAuth();
    resolver = new (cordovaPopupRedirectResolver as SingletonInstantiator<PopupRedirectResolver>)();
    provider = new GoogleAuthProvider();
    utilsStubs = sinon.stub(utils);
    eventsStubs = sinon.stub(events);
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
      eventsStubs._generateNewEvent.returns(event);

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

  describe('_initialize', () => {
    const NO_EVENT_TIMER_ID = 10001;
    const PACKAGE_NAME = 'my.package';
    const NOT_PACKAGE_NAME = 'not.my.package';
    let universalLinksCb: ((eventData: Record<string, string>|null) => unknown)|null;
    let tripNoEventTimer: TimerTripFn;

    beforeEach(() => {
      tripNoEventTimer = stubSingleTimeout(NO_EVENT_TIMER_ID);
      window.universalLinks = {
          subscribe(_unused, cb) {
          universalLinksCb = cb;
        },
      };
      window.BuildInfo = {
        packageName: PACKAGE_NAME,
        displayName: '',
      };
      sinon.stub(window, 'clearTimeout');
    });

    afterEach(() => {
      universalLinksCb = null;
    });

    function event(manager: EventManager): Promise<AuthEvent> {
      return new Promise(resolve => {
        (manager as CordovaAuthEventManager).addPassiveListener(resolve);
      });
    }

    context('when no event is present', () => {
      it('clears local storage and dispatches no-event event', async () => {
        const promise = event(await resolver._initialize(auth));
        tripNoEventTimer();
        const {error, ...rest} = await promise;

        expect(error).to.be.instanceOf(FirebaseError).with.property('code', 'auth/no-auth-event');
        expect(rest).to.eql({
          type: AuthEventType.UNKNOWN,
          eventId: null,
          sessionId: null,
          urlResponse: null,
          postBody: null,
          tenantId: null,
        });
        expect(events._getAndRemoveEvent).to.have.been.called;
      });
    });

    context('when an event is present', () => {
      it('clears the no event timeout',async () => {
        await resolver._initialize(auth);
        await universalLinksCb!({});
        expect(window.clearTimeout).to.have.been.calledWith(NO_EVENT_TIMER_ID);
      });

      it('signals no event if no url in event data', async () => {
        const promise = event(await resolver._initialize(auth));
        await universalLinksCb!({});
        const {error, ...rest} = await promise;

        expect(error).to.be.instanceOf(FirebaseError).with.property('code', 'auth/no-auth-event');
        expect(rest).to.eql({
          type: AuthEventType.UNKNOWN,
          eventId: null,
          sessionId: null,
          urlResponse: null,
          postBody: null,
          tenantId: null,
        });
      });

      it('signals no event if partial parse turns up null', async () => {
        const promise = event(await resolver._initialize(auth));
        eventsStubs._eventFromPartialAndUrl.returns(null);
        eventsStubs._getAndRemoveEvent.returns(Promise.resolve({
          type: AuthEventType.REAUTH_VIA_REDIRECT,
        } as AuthEvent));
        await universalLinksCb!({url: 'foo-bar'});
        const {error, ...rest} = await promise;

        expect(error).to.be.instanceOf(FirebaseError).with.property('code', 'auth/no-auth-event');
        expect(rest).to.eql({
          type: AuthEventType.UNKNOWN,
          eventId: null,
          sessionId: null,
          urlResponse: null,
          postBody: null,
          tenantId: null,
        });
      });

      it('signals the final event if partial expansion success', async () => {
        const finalEvent = {
          type: AuthEventType.REAUTH_VIA_REDIRECT,
          postBody: 'foo',
        };
        eventsStubs._getAndRemoveEvent.returns(Promise.resolve({
          type: AuthEventType.REAUTH_VIA_REDIRECT,
        } as AuthEvent));

        const promise = event(await resolver._initialize(auth));
        eventsStubs._eventFromPartialAndUrl.returns(finalEvent as AuthEvent);
        await universalLinksCb!({url: 'foo-bar'});
        expect(await promise).to.eq(finalEvent);
        expect(events._eventFromPartialAndUrl).to.have.been.calledWith(
          {type: AuthEventType.REAUTH_VIA_REDIRECT},
          'foo-bar'
        );
      });
    });

    context('when using global handleOpenUrl callback', () => {
      it('ignores inbound callbacks that are not for this app', async () => {
        await resolver._initialize(auth);
        handleOpenUrl(`${NOT_PACKAGE_NAME}://foo`);

        // Clear timeout is called in the handler so we can check that
        expect(window.clearTimeout).not.to.have.been.called;
      });

      it('passes through callback if package name matches', async () => {
        await resolver._initialize(auth);
        handleOpenUrl(`${PACKAGE_NAME}://foo`);
        expect(window.clearTimeout).to.have.been.calledWith(NO_EVENT_TIMER_ID);
      });

      it('signals the final event if partial expansion success', async () => {
        const finalEvent = {
          type: AuthEventType.REAUTH_VIA_REDIRECT,
          postBody: 'foo',
        };
        eventsStubs._getAndRemoveEvent.returns(Promise.resolve({
          type: AuthEventType.REAUTH_VIA_REDIRECT,
        } as AuthEvent));

        const promise = event(await resolver._initialize(auth));
        eventsStubs._eventFromPartialAndUrl.returns(finalEvent as AuthEvent);
        handleOpenUrl(`${PACKAGE_NAME}://foo`);
        expect(await promise).to.eq(finalEvent);
        expect(events._eventFromPartialAndUrl).to.have.been.calledWith(
          {type: AuthEventType.REAUTH_VIA_REDIRECT},
          `${PACKAGE_NAME}://foo`
        );
      });

      it('calls the dev existing handleOpenUrl function', async () => {
        const oldHandleOpenUrl = sinon.stub();
        window.handleOpenUrl = oldHandleOpenUrl;

        await resolver._initialize(auth);
        handleOpenUrl(`${PACKAGE_NAME}://foo`);
        expect(oldHandleOpenUrl).to.have.been.calledWith(`${PACKAGE_NAME}://foo`);
      });
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

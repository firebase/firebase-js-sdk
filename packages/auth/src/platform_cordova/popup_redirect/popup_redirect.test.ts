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

import { AuthProvider } from '../../model/public_types';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { SingletonInstantiator } from '../../core/util/instantiator';
import {
  AuthEvent,
  AuthEventType,
  EventManager,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { cordovaPopupRedirectResolver } from './popup_redirect';
import { GoogleAuthProvider } from '../../core/providers/google';
import * as utils from './utils';
import * as events from './events';
import { FirebaseError } from '@firebase/util';
import {
  stubSingleTimeout,
  TimerTripFn
} from '../../../test/helpers/timeout_stub';
import { _cordovaWindow } from '../plugins';
const win = _cordovaWindow();

describe('platform_cordova/popup_redirect/popup_redirect', () => {
  const PACKAGE_NAME = 'my.package';
  const NOT_PACKAGE_NAME = 'not.my.package';
  const NO_EVENT_TIMER_ID = 10001;

  let auth: TestAuth;
  let resolver: PopupRedirectResolverInternal;
  let provider: AuthProvider;
  let utilsStubs: sinon.SinonStubbedInstance<typeof utils>;
  let eventsStubs: sinon.SinonStubbedInstance<Partial<typeof events>>;
  let universalLinksCb:
    ((eventData: Record<string, string> | null) => unknown) | null;
  let tripNoEventTimer: TimerTripFn;

  beforeEach(async () => {
    auth = await testAuth();
    resolver = new (
      cordovaPopupRedirectResolver as SingletonInstantiator<PopupRedirectResolverInternal>
    )();
    provider = new GoogleAuthProvider();
    utilsStubs = vi.fn(utils);
    eventsStubs = {
      _generateNewEvent: vi.spyOn(events, '_generateNewEvent'),
      _savePartialEvent: vi.spyOn(events, '_savePartialEvent'),
      _getAndRemoveEvent: vi.spyOn(events, '_getAndRemoveEvent'),
      _eventFromPartialAndUrl: vi.spyOn(events, '_eventFromPartialAndUrl'),
      _getDeepLinkFromCallback: vi.spyOn(events, '_getDeepLinkFromCallback')
    };

    win.universalLinks = {
      subscribe(_unused, cb) {
        universalLinksCb = cb;
      }
    };
    win.BuildInfo = {
      packageName: PACKAGE_NAME,
      displayName: ''
    };
    tripNoEventTimer = stubSingleTimeout(NO_EVENT_TIMER_ID);
    vi.spyOn(win, 'clearTimeout');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    universalLinksCb = null;
    const anyWindow = win as unknown as Record<string, unknown>;
    delete anyWindow.universalLinks;
    delete anyWindow.BuildInfo;
  });

  describe('_openRedirect', () => {
    // The heavy-duty testing of the underlying configuration is in
    // platform_cordova/popup_redirect/utils.test.ts. These tests will check
    // primarily for the correct behavior using the values provided by the
    // utils.
    it('performs the redirect with the correct url after checking config', async () => {
      const event = {} as AuthEvent;
      utilsStubs._generateHandlerUrl.mockReturnValue(
        Promise.resolve('https://localhost/__/auth/handler')
      );
      utilsStubs._performRedirect.mockReturnValue(Promise.resolve({}));
      utilsStubs._waitForAppResume.mockReturnValue(Promise.resolve());
      utilsStubs._validateOrigin.mockReturnValue(Promise.resolve());
      eventsStubs._generateNewEvent!.mockReturnValue(event);

      const redirectPromise = resolver._openRedirect(
        auth,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT
      );
      // _openRedirect awaits the first event (eventManager initialized)
      tripNoEventTimer();
      await redirectPromise;

      expect(utilsStubs._checkCordovaConfiguration).toHaveBeenCalled();
      expect(utilsStubs._generateHandlerUrl).toHaveBeenCalledWith(
        auth,
        event,
        provider
      );
      expect(utilsStubs._performRedirect).toHaveBeenCalledWith(
        'https://localhost/__/auth/handler'
      );
      expect(utilsStubs._waitForAppResume).toHaveBeenCalled();
    });
  });

  describe('_initialize', () => {
    function event(manager: EventManager): Promise<AuthEvent> {
      return new Promise(resolve => {
        (manager as events.CordovaAuthEventManager).addPassiveListener(resolve);
      });
    }

    describe('when no event is present', () => {
      it('clears local storage and dispatches no-event event', async () => {
        const promise = event(await resolver._initialize(auth));
        tripNoEventTimer();
        const { error, ...rest } = await promise;

        expect(error)
          .toBeInstanceOf(FirebaseError)
          .with.property('code', 'auth/no-auth-event');
        expect(rest).toEqual({
          type: AuthEventType.UNKNOWN,
          eventId: null,
          sessionId: null,
          urlResponse: null,
          postBody: null,
          tenantId: null
        });
        expect(events._getAndRemoveEvent).toHaveBeenCalled();
      });
    });

    describe('when an event is present', () => {
      it('clears the no event timeout', async () => {
        await resolver._initialize(auth);
        await universalLinksCb!({});
        expect(win.clearTimeout).toHaveBeenCalledWith(NO_EVENT_TIMER_ID);
      });

      it('signals no event if no url in event data', async () => {
        const promise = event(await resolver._initialize(auth));
        await universalLinksCb!({});
        const { error, ...rest } = await promise;

        expect(error)
          .toBeInstanceOf(FirebaseError)
          .with.property('code', 'auth/no-auth-event');
        expect(rest).toEqual({
          type: AuthEventType.UNKNOWN,
          eventId: null,
          sessionId: null,
          urlResponse: null,
          postBody: null,
          tenantId: null
        });
      });

      it('signals no event if partial parse turns up null', async () => {
        const promise = event(await resolver._initialize(auth));
        eventsStubs._eventFromPartialAndUrl!.mockReturnValue(null);
        eventsStubs._getAndRemoveEvent!.mockReturnValue(
          Promise.resolve({
            type: AuthEventType.REAUTH_VIA_REDIRECT
          } as AuthEvent)
        );
        await universalLinksCb!({ url: 'foo-bar' });
        const { error, ...rest } = await promise;

        expect(error)
          .toBeInstanceOf(FirebaseError)
          .with.property('code', 'auth/no-auth-event');
        expect(rest).toEqual({
          type: AuthEventType.UNKNOWN,
          eventId: null,
          sessionId: null,
          urlResponse: null,
          postBody: null,
          tenantId: null
        });
      });

      it('signals the final event if partial expansion success', async () => {
        const finalEvent = {
          type: AuthEventType.REAUTH_VIA_REDIRECT,
          postBody: 'foo'
        };
        eventsStubs._getAndRemoveEvent!.mockReturnValue(
          Promise.resolve({
            type: AuthEventType.REAUTH_VIA_REDIRECT
          } as AuthEvent)
        );

        const promise = event(await resolver._initialize(auth));
        eventsStubs._eventFromPartialAndUrl!.mockReturnValue(
          finalEvent as AuthEvent
        );
        await universalLinksCb!({ url: 'foo-bar' });
        expect(await promise).toBe(finalEvent);
        expect(events._eventFromPartialAndUrl).toHaveBeenCalledWith(
          { type: AuthEventType.REAUTH_VIA_REDIRECT },
          'foo-bar'
        );
      });
    });

    describe('when using global handleOpenURL callback', () => {
      it('ignores inbound callbacks that are not for this app', async () => {
        await resolver._initialize(auth);
        win.handleOpenURL(`${NOT_PACKAGE_NAME}://foo`);

        // Clear timeout is called in the handler so we can check that
        expect(win.clearTimeout).not.toHaveBeenCalled();
      });

      it('passes through callback if package name matches', async () => {
        await resolver._initialize(auth);
        win.handleOpenURL(`${PACKAGE_NAME}://foo`);
        expect(win.clearTimeout).toHaveBeenCalledWith(NO_EVENT_TIMER_ID);
      });

      it('signals the final event if partial expansion success', async () => {
        const finalEvent = {
          type: AuthEventType.REAUTH_VIA_REDIRECT,
          postBody: 'foo'
        };
        eventsStubs._getAndRemoveEvent!.mockReturnValue(
          Promise.resolve({
            type: AuthEventType.REAUTH_VIA_REDIRECT
          } as AuthEvent)
        );

        const promise = event(await resolver._initialize(auth));
        eventsStubs._eventFromPartialAndUrl!.mockReturnValue(
          finalEvent as AuthEvent
        );
        win.handleOpenURL(`${PACKAGE_NAME}://foo`);
        expect(await promise).toBe(finalEvent);
        expect(events._eventFromPartialAndUrl).toHaveBeenCalledWith(
          { type: AuthEventType.REAUTH_VIA_REDIRECT },
          `${PACKAGE_NAME}://foo`
        );
      });

      it('calls the dev existing handleOpenURL function', async () => {
        const oldHandleOpenURL = vi.fn();
        win.handleOpenURL = oldHandleOpenURL;

        await resolver._initialize(auth);
        win.handleOpenURL(`${PACKAGE_NAME}://foo`);
        expect(oldHandleOpenURL).toHaveBeenCalledWith(`${PACKAGE_NAME}://foo`);
      });

      it('calls the dev existing handleOpenURL function for other package', async () => {
        const oldHandleOpenURL = vi.fn();
        win.handleOpenURL = oldHandleOpenURL;

        await resolver._initialize(auth);
        win.handleOpenURL(`${NOT_PACKAGE_NAME}://foo`);
        expect(oldHandleOpenURL).toHaveBeenCalledWith(
          `${NOT_PACKAGE_NAME}://foo`
        );
      });
    });
  });

  describe('_openPopup', () => {
    it('throws an error', () => {
      expect(() =>
        resolver._openPopup(auth, provider, AuthEventType.LINK_VIA_POPUP)
      ).toThrow(
        FirebaseError,
        'auth/operation-not-supported-in-this-environment'
      );
    });
  });
});

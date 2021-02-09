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

import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { FirebaseError, querystring } from '@firebase/util';
import { expect, use } from 'chai';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { AuthEvent, AuthEventType } from '../../model/popup_redirect';
import {
  _eventFromPartialAndUrl,
  _generateNewEvent,
  _getAndRemoveEvent,
  _getDeepLinkFromCallback,
  _savePartialEvent
} from './events';
import { _createError } from '../../core/util/assert';
import { AuthErrorCode } from '../../core/errors';

use(sinonChai);

describe('platform_cordova/popup_redirect/events', () => {
  let auth: TestAuth;
  let storageStub: sinon.SinonStubbedInstance<typeof localStorage>;

  beforeEach(async () => {
    auth = await testAuth();
    storageStub = sinon.stub(localStorage);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('_generateNewEvent', () => {
    it('sets the correct type and tenantId', () => {
      auth.tenantId = 'tid---------------';
      const event = _generateNewEvent(auth, AuthEventType.LINK_VIA_REDIRECT);
      expect(event.type).to.eq(AuthEventType.LINK_VIA_REDIRECT);
      expect(event.tenantId).to.eq(auth.tenantId);
    });

    it('creates an event with a 20-char session id', () => {
      const event = _generateNewEvent(auth, AuthEventType.SIGN_IN_VIA_REDIRECT);
      expect(event.sessionId).to.be.a('string').with.length(20);
    });

    it('sets the error field to be a "no auth event" error', () => {
      const { error } = _generateNewEvent(
        auth,
        AuthEventType.REAUTH_VIA_REDIRECT
      );
      expect(error)
        .to.be.instanceOf(FirebaseError)
        .with.property('code', 'auth/no-auth-event');
    });
  });

  describe('_savePartialEvent', () => {
    it('sets the event', async () => {
      const event = _generateNewEvent(auth, AuthEventType.REAUTH_VIA_REDIRECT);
      await _savePartialEvent(auth, event);
      expect(storageStub.setItem).to.have.been.calledWith(
        'firebase:authEvent:test-api-key:test-app',
        JSON.stringify(event)
      );
    });
  });

  describe('_getAndRemoveEvent', () => {
    it('returns null if no event is present', async () => {
      storageStub.getItem.returns(null);
      expect(await _getAndRemoveEvent(auth)).to.be.null;
    });

    it('returns the event and deletes the key if present', async () => {
      const event = JSON.stringify(
        _generateNewEvent(auth, AuthEventType.REAUTH_VIA_REDIRECT)
      );
      storageStub.getItem.returns(event);
      expect(await _getAndRemoveEvent(auth)).to.eql(JSON.parse(event));
      expect(storageStub.removeItem).to.have.been.calledWith(
        'firebase:authEvent:test-api-key:test-app'
      );
    });
  });

  describe('_eventFromPartialAndUrl', () => {
    let partialEvent: AuthEvent;
    beforeEach(() => {
      partialEvent = _generateNewEvent(
        auth,
        AuthEventType.REAUTH_VIA_REDIRECT,
        'id'
      );
    });

    function generateCallbackUrl(params: Record<string, string>): string {
      const deepLink = `http://foo/__/auth/callback?${querystring(params)}`;
      return `http://outer-app?link=${encodeURIComponent(deepLink)}`;
    }

    it('returns the proper event if everything is correct w/ no error', () => {
      const url = generateCallbackUrl({});
      expect(_eventFromPartialAndUrl(partialEvent, url)).to.eql({
        type: AuthEventType.REAUTH_VIA_REDIRECT,
        eventId: 'id',
        tenantId: null,
        sessionId: partialEvent.sessionId,
        urlResponse: 'http://foo/__/auth/callback?',
        postBody: null
      });
    });

    it('returns null if the callback url has no link', () => {
      expect(_eventFromPartialAndUrl(partialEvent, 'http://foo')).to.be.null;
    });

    it('generates an error if the callback has an error', () => {
      const handlerError = _createError(AuthErrorCode.INTERNAL_ERROR);
      const url = generateCallbackUrl({
        'firebaseError': JSON.stringify(handlerError)
      });
      const { error, ...rest } = _eventFromPartialAndUrl(partialEvent, url)!;

      expect(error)
        .to.be.instanceOf(FirebaseError)
        .with.property('code', 'auth/internal-error');
      expect(rest).to.eql({
        type: AuthEventType.REAUTH_VIA_REDIRECT,
        eventId: 'id',
        tenantId: null,
        urlResponse: null,
        sessionId: null,
        postBody: null
      });
    });
  });

  describe('_getDeepLinkFromCallback', () => {
    it('returns the iOS double deep link preferentially', () => {
      expect(
        _getDeepLinkFromCallback(
          'https://foo?link=http%3A%2F%2Ffoo%3Flink%3DdoubleDeep' +
            '&deep_link_id=http%3A%2F%2Ffoo%3Flink%3DdoubleDeepIos'
        )
      ).to.eq('doubleDeepIos');
    });

    it('returns the iOS deep link preferentially', () => {
      expect(
        _getDeepLinkFromCallback(
          'https://foo?link=http%3A%2F%2Ffoo%3Flink%3DdoubleDeep' +
            '&deep_link_id=http%3A%2F%2FfooIOS'
        )
      ).to.eq('http://fooIOS');
    });

    it('returns double deep link preferentially', () => {
      expect(
        _getDeepLinkFromCallback(
          'https://foo?link=http%3A%2F%2Ffoo%3Flink%3DdoubleDeep'
        )
      ).to.eq('doubleDeep');
    });

    it('returns the deep link preferentially', () => {
      expect(
        _getDeepLinkFromCallback(
          'https://foo?link=http%3A%2F%2Ffoo%3Funrelated%3Dyeah'
        )
      ).to.eq('http://foo?unrelated=yeah');
    });

    it('returns the passed-in url when all else fails', () => {
      expect(_getDeepLinkFromCallback('https://foo?bar=baz')).to.eq(
        'https://foo?bar=baz'
      );
    });
  });
});

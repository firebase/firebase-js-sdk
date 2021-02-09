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

import { FirebaseError } from '@firebase/util';
import { expect } from 'chai';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { AuthEventType } from '../../model/popup_redirect';
import { _generateNewEvent } from './events';

describe('platform_cordova/popup_redirect/events', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
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
});

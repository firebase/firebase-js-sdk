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
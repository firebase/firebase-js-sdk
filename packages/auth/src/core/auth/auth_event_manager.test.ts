/**
 * @license
 * Copyright 2026 Google LLC
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

import { testAuth } from '../../../test/helpers/mock_auth';

import {
  AuthEvent,
  AuthEventConsumer,
  AuthEventError,
  AuthEventType
} from '../../model/popup_redirect';
import { AuthErrorCode } from '../errors';
import { AuthEventManager } from './auth_event_manager';
describe('core/auth/auth_event_manager', () => {
  let manager: AuthEventManager;

  function makeConsumer(
    filter: AuthEventType | AuthEventType[]
  ): AuthEventConsumer & {
    onAuthEvent: any;
    onError: any;
  } {
    return {
      filter: Array.isArray(filter) ? filter : [filter],
      onAuthEvent: vi.fn(),
      onError: vi.fn(),
      eventId: null
    };
  }

  function makeEvent(type: AuthEventType, eventId = 'event'): AuthEvent {
    return {
      type,
      eventId
    } as AuthEvent;
  }

  beforeEach(async () => {
    manager = new AuthEventManager(await testAuth());
  });

  it('multiple consumers may be registered for one event type', () => {
    const a = makeConsumer(AuthEventType.LINK_VIA_POPUP);
    const b = makeConsumer(AuthEventType.LINK_VIA_POPUP);

    const evt = makeEvent(AuthEventType.LINK_VIA_POPUP);
    manager.registerConsumer(a);
    manager.registerConsumer(b);
    manager.onEvent(evt);

    expect(a.onAuthEvent).toHaveBeenCalledWith(evt);
    expect(b.onAuthEvent).toHaveBeenCalledWith(evt);
  });

  it('can unregister listeners', () => {
    const a = makeConsumer(AuthEventType.LINK_VIA_POPUP);
    const b = makeConsumer(AuthEventType.LINK_VIA_POPUP);

    const evt = makeEvent(AuthEventType.LINK_VIA_POPUP);
    manager.registerConsumer(a);
    manager.registerConsumer(b);
    manager.unregisterConsumer(a);
    manager.onEvent(evt);

    expect(a.onAuthEvent).not.toHaveBeenCalledWith(evt);
    expect(b.onAuthEvent).toHaveBeenCalledWith(evt);
  });

  it('does not call the consumer if filter does not match', () => {
    const consumer = makeConsumer(AuthEventType.REAUTH_VIA_POPUP);
    manager.registerConsumer(consumer);
    manager.onEvent(makeEvent(AuthEventType.REAUTH_VIA_REDIRECT));
    expect(consumer.onAuthEvent).not.toHaveBeenCalled();
  });

  it('does not call through if eventId does not match', () => {
    const consumer = makeConsumer(AuthEventType.REAUTH_VIA_POPUP);
    consumer.eventId = 'not-event-id';
    manager.registerConsumer(consumer);

    manager.onEvent(makeEvent(AuthEventType.REAUTH_VIA_POPUP, 'event-id'));
    expect(consumer.onAuthEvent).not.toHaveBeenCalled();
  });

  it('does call through if eventId is null', () => {
    const consumer = makeConsumer(AuthEventType.REAUTH_VIA_POPUP);
    consumer.eventId = null;
    manager.registerConsumer(consumer);

    manager.onEvent(makeEvent(AuthEventType.REAUTH_VIA_POPUP, 'event-id'));
    expect(consumer.onAuthEvent).toHaveBeenCalled();
  });

  it('converts errors into FirebaseError if the type matches', () => {
    const consumer = makeConsumer(AuthEventType.REAUTH_VIA_POPUP);
    manager.registerConsumer(consumer);
    const event = makeEvent(AuthEventType.REAUTH_VIA_POPUP);
    event.error = {
      code: `auth/${AuthErrorCode.INVALID_APP_CREDENTIAL}`,
      message: 'foo',
      name: 'name'
    };

    manager.onEvent(event);
    const error = consumer.onError.mock.calls[0][0];
    expect(error.code).toBe(`auth/${AuthErrorCode.INVALID_APP_CREDENTIAL}`);
  });

  it('converts random errors into FirebaseError with internal error', () => {
    const consumer = makeConsumer(AuthEventType.REAUTH_VIA_POPUP);
    manager.registerConsumer(consumer);
    const event = makeEvent(AuthEventType.REAUTH_VIA_POPUP);
    event.error = {
      message: 'foo',
      name: 'name'
    } as AuthEventError;

    manager.onEvent(event);
    const error = consumer.onError.mock.calls[0][0];
    expect(error.code).toBe(`auth/${AuthErrorCode.INTERNAL_ERROR}`);
  });

  describe('redirect consumers', () => {
    let consumer: AuthEventConsumer;

    beforeEach(() => {
      consumer = makeConsumer([
        AuthEventType.SIGN_IN_VIA_REDIRECT,
        AuthEventType.LINK_VIA_REDIRECT,
        AuthEventType.REAUTH_VIA_REDIRECT,
        AuthEventType.UNKNOWN
      ]);
    });

    it('redirect events are queued until the future', () => {
      const event = makeEvent(AuthEventType.REAUTH_VIA_REDIRECT);
      expect(manager.onEvent(event)).toBe(true);

      manager.registerConsumer(consumer);
      expect(consumer.onAuthEvent).toHaveBeenCalledWith(event);
    });

    it('queued redirects only work for the first new consumer', () => {
      const event = makeEvent(AuthEventType.REAUTH_VIA_REDIRECT);
      expect(manager.onEvent(event)).toBe(true);

      manager.registerConsumer(consumer);
      expect(consumer.onAuthEvent).toHaveBeenCalledWith(event);

      const consumerB = makeConsumer(AuthEventType.REAUTH_VIA_REDIRECT);
      manager.registerConsumer(consumerB);
      expect(consumerB.onAuthEvent).not.toHaveBeenCalled();
    });

    it('does not queue a redirect event if it was handled immediately', () => {
      const event = makeEvent(AuthEventType.REAUTH_VIA_REDIRECT);
      manager.registerConsumer(consumer);

      expect(manager.onEvent(event)).toBe(true);
      expect(consumer.onAuthEvent).toHaveBeenCalledWith(event);

      const consumerB = makeConsumer(AuthEventType.REAUTH_VIA_REDIRECT);
      manager.registerConsumer(consumerB);
      expect(consumerB.onAuthEvent).not.toHaveBeenCalled();
    });

    it('queues unknown events', () => {
      const event = makeEvent(AuthEventType.UNKNOWN);
      event.error = { code: 'auth/no-auth-event' } as AuthEventError;
      expect(manager.onEvent(event)).toBe(true);

      manager.registerConsumer(consumer);
      expect(consumer.onAuthEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('only runs the event once for the consumer', () => {
      const consumer = makeConsumer(AuthEventType.LINK_VIA_POPUP);

      const evt = makeEvent(AuthEventType.LINK_VIA_POPUP);
      manager.registerConsumer(consumer);
      manager.onEvent(evt);
      manager.onEvent(evt);

      expect(consumer.onAuthEvent).toHaveBeenCalledTimes(1);
    });

    it('clears the cache after ten minutes', () => {
      const consumer = makeConsumer(AuthEventType.LINK_VIA_POPUP);

      const evt = makeEvent(AuthEventType.LINK_VIA_POPUP);
      manager.registerConsumer(consumer);
      manager.onEvent(evt);
      vi.advanceTimersByTime(11 * 60 * 1000);
      manager.onEvent(evt);

      expect(consumer.onAuthEvent).toHaveBeenCalledTimes(2);
    });

    it('also caches stored redirects', () => {
      const consumer = makeConsumer([
        AuthEventType.SIGN_IN_VIA_REDIRECT,
        AuthEventType.LINK_VIA_REDIRECT,
        AuthEventType.REAUTH_VIA_REDIRECT,
        AuthEventType.UNKNOWN
      ]);
      const event = makeEvent(AuthEventType.REAUTH_VIA_REDIRECT);
      manager.onEvent(event);
      manager.registerConsumer(consumer);
      manager.onEvent(event);
      expect(consumer.onAuthEvent).toHaveBeenCalledTimes(1);
    });
  });
});

import '../testing/setup';

import * as tokenManagementModule from '../core/token-management';

import {
  CONSOLE_CAMPAIGN_ANALYTICS_ENABLED,
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME,
  DEFAULT_SW_PATH,
  DEFAULT_SW_SCOPE,
  DEFAULT_VAPID_KEY
} from '../util/constants';
import { InternalMessage, MessageType } from '../interfaces/internal-message';
import { SinonFakeTimers, SinonSpy, spy, stub, useFakeTimers } from 'sinon';
import { Spy, Stub } from '../testing/sinon-types';

import { ErrorCode } from '../util/errors';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { FirebaseAnalyticsInternal } from '@firebase/analytics-interop-types';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { WindowController } from './window-controller';
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
import { expect } from 'chai';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';

type MessageEventListener = (event: Event) => Promise<void>;

const ORIGINAL_SW_REGISTRATION = ServiceWorkerRegistration;

describe('WindowController', () => {
  let firebaseDependencies: FirebaseInternalDependencies;
  let swRegistration: ServiceWorkerRegistration;
  let windowController: WindowController;

  let getTokenStub: Stub<typeof tokenManagementModule.getToken>;
  let deleteTokenStub: Stub<typeof tokenManagementModule.deleteToken>;
  let registerStub: Stub<typeof navigator.serviceWorker.register>;
  let addEventListenerStub: Stub<typeof navigator.serviceWorker.addEventListener>;

  /** The event listener that WindowController adds to the message event. */
  let messageEventListener: MessageEventListener;

  beforeEach(() => {
    // To trick the instanceof check in useServiceWorker.
    self.ServiceWorkerRegistration = FakeServiceWorkerRegistration;

    firebaseDependencies = getFakeFirebaseDependencies();
    swRegistration = new FakeServiceWorkerRegistration();

    stub(Notification, 'permission').value('granted');
    registerStub = stub(navigator.serviceWorker, 'register').resolves(
      swRegistration
    );
    addEventListenerStub = stub(
      navigator.serviceWorker,
      'addEventListener'
    ).callsFake((type, listener) => {
      expect(type).to.equal('message');

      if ('handleEvent' in listener) {
        messageEventListener = listener.handleEvent as MessageEventListener;
      } else {
        messageEventListener = listener as MessageEventListener;
      }
    });
    getTokenStub = stub(tokenManagementModule, 'getToken').resolves('fcmToken');
    deleteTokenStub = stub(tokenManagementModule, 'deleteToken').resolves(true);

    windowController = new WindowController(firebaseDependencies);
  });

  afterEach(() => {
    self.ServiceWorkerRegistration = ORIGINAL_SW_REGISTRATION;
  });

  it('has app', () => {
    expect(windowController.app).to.equal(firebaseDependencies.app);
  });

  it('adds the message event listener on creation', () => {
    expect(addEventListenerStub).to.have.been.called;
  });

  it('throws when service-worker-only methods are called', () => {
    expect(() => windowController.setBackgroundMessageHandler()).to.throw(
      'messaging/only-available-in-sw'
    );
  });

  describe('getToken', () => {
    it('throws if permission is denied', async () => {
      stub(Notification, 'permission').value('denied');

      try {
        await windowController.getToken();
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).to.equal(`messaging/${ErrorCode.PERMISSION_BLOCKED}`);
      }
    });

    it('asks for permission if permission is default', async () => {
      stub(Notification, 'permission').value('default');
      const requestPermissionStub = stub(
        Notification,
        'requestPermission'
      ).resolves('denied');

      try {
        await windowController.getToken();
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).to.equal(`messaging/${ErrorCode.PERMISSION_BLOCKED}`);
      }

      expect(requestPermissionStub).to.have.been.calledOnce;
    });

    it('registers the default SW', async () => {
      await windowController.getToken();

      expect(registerStub).to.have.been.calledOnceWith(DEFAULT_SW_PATH, {
        scope: DEFAULT_SW_SCOPE
      });
    });

    it('throws if there is a failure to get SW registration', async () => {
      registerStub.rejects();

      try {
        await windowController.getToken();
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).to.equal(
          `messaging/${ErrorCode.FAILED_DEFAULT_REGISTRATION}`
        );
      }
    });

    it('calls tokenManagement.getToken with the default SW and VAPID key', async () => {
      await windowController.getToken();

      expect(getTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        swRegistration,
        DEFAULT_VAPID_KEY
      );
    });

    it('calls tokenManagement.getToken with the specified SW and VAPID key', async () => {
      const differentSwRegistration = new FakeServiceWorkerRegistration();
      differentSwRegistration.scope = '/different-scope';

      windowController.usePublicVapidKey('newVapidKey');
      windowController.useServiceWorker(differentSwRegistration);
      await windowController.getToken();

      expect(getTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        differentSwRegistration,
        'newVapidKey'
      );
    });
  });

  describe('deleteToken', () => {
    it('calls tokenManagement.deleteToken with the default SW', async () => {
      await windowController.deleteToken();

      expect(deleteTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        swRegistration
      );
    });

    it('calls tokenManagement.deleteToken with the specified SW', async () => {
      const differentSwRegistration = new FakeServiceWorkerRegistration();
      differentSwRegistration.scope = '/different-scope';

      windowController.useServiceWorker(differentSwRegistration);
      await windowController.deleteToken();

      expect(deleteTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        differentSwRegistration
      );
    });
  });

  describe('requestPermission', () => {
    it('should resolve if the permission is already granted', async () => {
      stub(Notification, 'permission').value('granted');

      return windowController.requestPermission();
    });

    it('should reject if requestPermission resolves with "denied"', async () => {
      stub(Notification, 'permission').value('default');
      stub(Notification, 'requestPermission').resolves('denied');

      try {
        await windowController.requestPermission();
        throw new Error('Expected an error.');
      } catch (err) {
        expect(err.code).to.equal('messaging/permission-blocked');
      }
    });

    it('should reject if requestPermission resolves with "default"', async () => {
      stub(Notification, 'permission').value('default');
      stub(Notification, 'requestPermission').resolves('default');

      try {
        await windowController.requestPermission();
        throw new Error('Expected an error.');
      } catch (err) {
        expect(err.code).to.equal('messaging/permission-default');
      }
    });

    it('should resolve if requestPermission resolves with "granted"', async () => {
      stub(Notification, 'permission').value('default');
      stub(Notification, 'requestPermission').resolves('granted');

      return windowController.requestPermission();
    });
  });

  describe('onMessage', () => {
    it('sets the onMessage callback', async () => {
      const onMessageCallback = spy();
      windowController.onMessage(onMessageCallback);

      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: { notification: { title: 'hello', body: 'world' } }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageCallback).to.have.been.called;
    });

    it('works with an observer', async () => {
      const onMessageCallback = spy();
      windowController.onMessage({
        next: onMessageCallback,
        error: () => {},
        complete: () => {}
      });

      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: { notification: { title: 'hello', body: 'world' } }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageCallback).to.have.been.called;
    });

    it('returns a function that unsets the onMessage callback', async () => {
      const onMessageCallback = spy();
      const unsubscribe = windowController.onMessage(onMessageCallback);
      unsubscribe();

      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: { notification: { title: 'hello', body: 'world' } }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageCallback).not.to.have.been.called;
    });
  });

  describe('usePublicVapidKey', () => {
    it('throws on invalid input', () => {
      expect(() =>
        windowController.usePublicVapidKey((null as unknown) as string)
      ).to.throw('messaging/invalid-vapid-key');

      expect(() => windowController.usePublicVapidKey('')).to.throw(
        'messaging/invalid-vapid-key'
      );
    });

    it('throws if called twice', () => {
      windowController.usePublicVapidKey('dmFwaWQta2V5LXZhbHVl');
      expect(() =>
        windowController.usePublicVapidKey('dmFwaWQta2V5LXZhbHVl')
      ).to.throw('messaging/use-vapid-key-after-get-token');
    });

    it('throws if called after getToken', async () => {
      await windowController.getToken();

      expect(() =>
        windowController.usePublicVapidKey('dmFwaWQta2V5LXZhbHVl')
      ).to.throw('messaging/use-vapid-key-after-get-token');
    });
  });

  describe('useServiceWorker', () => {
    it('throws on invalid input', () => {
      expect(() =>
        windowController.useServiceWorker(
          ({} as unknown) as ServiceWorkerRegistration
        )
      ).to.throw('messaging/invalid-sw-registration');
    });

    it('throws if called twice', () => {
      windowController.useServiceWorker(swRegistration);
      expect(() => windowController.useServiceWorker(swRegistration)).to.throw(
        'messaging/use-sw-after-get-token'
      );
    });

    it('throws if called after getToken', async () => {
      await windowController.getToken();

      expect(() => windowController.useServiceWorker(swRegistration)).to.throw(
        'messaging/use-sw-after-get-token'
      );
    });
  });

  describe('SW message event handler', () => {
    let clock: SinonFakeTimers;
    let onMessageSpy: SinonSpy;
    let logEventSpy: Spy<FirebaseAnalyticsInternal['logEvent']>;

    beforeEach(() => {
      clock = useFakeTimers();

      const analytics = firebaseDependencies.analyticsProvider.getImmediate();
      logEventSpy = spy(analytics, 'logEvent');

      onMessageSpy = spy();
      windowController.onMessage(onMessageSpy);
    });

    it('does nothing when non-fcm message is passed in', async () => {
      await messageEventListener(
        new MessageEvent('message', { data: 'non-fcm-message' })
      );

      expect(onMessageSpy).not.to.have.been.called;
      expect(logEventSpy).not.to.have.been.called;
    });

    it('calls onMessage callback when it receives a PUSH_RECEIVED message', async () => {
      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: { notification: { title: 'hello', body: 'world' } }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageSpy).to.have.been.calledOnceWith(
        message.firebaseMessaging.payload
      );
      expect(logEventSpy).not.to.have.been.called;
    });

    it('does not call onMessage callback when it receives a NOTIFICATION_CLICKED message', async () => {
      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.NOTIFICATION_CLICKED,
          payload: { notification: { title: 'hello', body: 'world' } }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageSpy).not.to.have.been.called;
      expect(logEventSpy).not.to.have.been.called;
    });

    it('calls analytics.logEvent if the message has analytics enabled for PUSH_RECEIVED', async () => {
      const data = {
        [CONSOLE_CAMPAIGN_ID]: '123456',
        [CONSOLE_CAMPAIGN_NAME]: 'Campaign Name',
        [CONSOLE_CAMPAIGN_TIME]: '1234567890',
        [CONSOLE_CAMPAIGN_ANALYTICS_ENABLED]: '1'
      };
      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.PUSH_RECEIVED,
          payload: {
            notification: { title: 'hello', body: 'world' },
            data
          }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageSpy).to.have.been.calledOnceWith(
        message.firebaseMessaging.payload
      );
      expect(logEventSpy).to.have.been.calledOnceWith(
        'notification_foreground',
        {
          /* eslint-disable camelcase */
          message_id: data[CONSOLE_CAMPAIGN_ID],
          message_name: data[CONSOLE_CAMPAIGN_NAME],
          message_time: data[CONSOLE_CAMPAIGN_TIME],
          message_device_time: clock.now
          /* eslint-enable camelcase */
        }
      );
    });

    it('calls analytics.logEvent if the message has analytics enabled for NOTIFICATION_CLICKED', async () => {
      const data = {
        [CONSOLE_CAMPAIGN_ID]: '123456',
        [CONSOLE_CAMPAIGN_NAME]: 'Campaign Name',
        [CONSOLE_CAMPAIGN_TIME]: '1234567890',
        [CONSOLE_CAMPAIGN_ANALYTICS_ENABLED]: '1'
      };
      const message: InternalMessage = {
        firebaseMessaging: {
          type: MessageType.NOTIFICATION_CLICKED,
          payload: {
            notification: { title: 'hello', body: 'world' },
            data
          }
        }
      };

      await messageEventListener(
        new MessageEvent('message', { data: message })
      );

      expect(onMessageSpy).not.to.have.been.called;
      expect(logEventSpy).to.have.been.calledOnceWith('notification_open', {
        /* eslint-disable camelcase */
        message_id: data[CONSOLE_CAMPAIGN_ID],
        message_name: data[CONSOLE_CAMPAIGN_NAME],
        message_time: data[CONSOLE_CAMPAIGN_TIME],
        message_device_time: clock.now
        /* eslint-enable camelcase */
      });
    });
  });

  describe('onTokenRefresh', () => {
    it('returns an unsubscribe function that does nothing', () => {
      const unsubscribe = windowController.onTokenRefresh();
      expect(unsubscribe).not.to.throw;
    });
  });
});

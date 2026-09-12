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

import './testing/setup';

import { MessagingService } from './messaging-service';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from './testing/fakes/firebase-dependencies';
import { stub } from 'sinon';
import { expect } from 'chai';

describe('MessagingService', () => {
  let messaging: MessagingService;

  beforeEach(() => {
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
  });

  describe('_delete', () => {
    it('unsubscribes from FID changes and clears the reference', async () => {
      const fidChangeUnsubscribe = stub();
      messaging._fidChangeUnsubscribe = fidChangeUnsubscribe;

      await messaging._delete();

      expect(fidChangeUnsubscribe).to.have.been.calledOnce;
      expect(messaging._fidChangeUnsubscribe).to.be.null;
    });

    it('removes the message event listener and clears the reference', async () => {
      const messageEventListenerUnsubscribe = stub();
      messaging._messageEventListenerUnsubscribe =
        messageEventListenerUnsubscribe;

      await messaging._delete();

      expect(messageEventListenerUnsubscribe).to.have.been.calledOnce;
      expect(messaging._messageEventListenerUnsubscribe).to.be.null;
    });

    it('clears a scheduled log queue timer and resets log state', async () => {
      const timerId = setTimeout(() => {}, 10000);
      messaging.logQueue = { state: 'scheduled', timerId };
      messaging.logEvents = [{} as (typeof messaging.logEvents)[number]];

      await messaging._delete();

      expect(messaging.logQueue).to.deep.equal({ state: 'stopped' });
      expect(messaging.logEvents).to.be.empty;
    });

    it('resets all message handlers', async () => {
      messaging.onMessageHandler = stub();
      messaging.onBackgroundMessageHandler = stub();
      messaging.onRegisteredHandler = stub();
      messaging.onUnregisteredHandler = stub();

      await messaging._delete();

      expect(messaging.onMessageHandler).to.be.null;
      expect(messaging.onBackgroundMessageHandler).to.be.null;
      expect(messaging.onRegisteredHandler).to.be.null;
      expect(messaging.onUnregisteredHandler).to.be.null;
    });

    it('resolves when nothing was registered', async () => {
      await messaging._delete();

      expect(messaging._fidChangeUnsubscribe).to.be.null;
      expect(messaging._messageEventListenerUnsubscribe).to.be.null;
    });
  });
});

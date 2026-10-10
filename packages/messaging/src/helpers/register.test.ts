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

import '../testing/setup';

import {
  mockServiceWorker,
  restoreServiceWorker
} from '../testing/fakes/service-worker';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { ComponentContainer } from '@firebase/component';
import { MessagingService } from '../messaging-service';
import { ServiceWorkerGlobalScope } from '../util/sw-types';
import { SwMessagingFactory } from './register';
import { expect } from 'chai';
import { stub } from 'sinon';

// Add fake SW types.
declare const self: ServiceWorkerGlobalScope;

describe('SwMessagingFactory', () => {
  beforeEach(() => {
    mockServiceWorker();
    stub(self, 'addEventListener');
  });

  afterEach(() => {
    restoreServiceWorker();
  });

  it('sets swRegistration from the service worker global scope', () => {
    const container = {
      getProvider: (name: string) => {
        switch (name) {
          case 'app':
            return { getImmediate: () => getFakeApp() };
          case 'installations-internal':
            return { getImmediate: () => getFakeInstallations() };
          case 'analytics-internal':
            return getFakeAnalyticsProvider();
          default:
            throw new Error(`Unexpected provider: ${name}`);
        }
      }
    } as unknown as ComponentContainer;

    const messaging = SwMessagingFactory(container, {
      instanceIdentifier: undefined,
      options: undefined
    }) as MessagingService;

    // Token operations triggered inside the service worker (e.g. the
    // pushsubscriptionchange handler) dereference swRegistration, so the
    // factory must initialize it. See issue #9213.
    expect(messaging.swRegistration).to.equal(self.registration);
  });
});

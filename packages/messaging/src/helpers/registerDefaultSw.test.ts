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

import { expect } from 'chai';
import { stub, useFakeTimers } from 'sinon';

import type { MessagingService } from '../messaging-service';
import { getFakeMessagingService } from '../testing/fakes/messaging-service';
import {
  DEFAULT_REGISTRATION_TIMEOUT,
  DEFAULT_SW_SCOPE
} from '../util/constants';
import { registerDefaultSw } from './registerDefaultSw';

/** Minimal ServiceWorker whose state transitions can be driven by the test. */
class ControllableServiceWorker extends EventTarget {
  constructor(public state: ServiceWorkerState = 'installing') {
    super();
  }

  transitionTo(state: ServiceWorkerState): void {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

/** Minimal ServiceWorkerRegistration with controllable worker slots. */
class ControllableRegistration extends EventTarget {
  active: ServiceWorker | null = null;
  installing: ServiceWorker | null = null;
  waiting: ServiceWorker | null = null;
  scope = DEFAULT_SW_SCOPE;

  async update(): Promise<void> {}

  async unregister(): Promise<boolean> {
    return true;
  }
}

function asWorker(sw: ControllableServiceWorker): ServiceWorker {
  return sw as unknown as ServiceWorker;
}

function asRegistration(
  reg: ControllableRegistration
): ServiceWorkerRegistration {
  return reg as unknown as ServiceWorkerRegistration;
}

// Lets the awaited navigator.serviceWorker.register() settle so that
// waitForRegistrationActive has attached its listeners before the test drives
// service worker state transitions.
function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('registerDefaultSw', () => {
  let messaging: MessagingService;

  beforeEach(() => {
    messaging = getFakeMessagingService();
  });

  it('resolves when the registration already has an active worker', async () => {
    const registration = new ControllableRegistration();
    registration.active = asWorker(new ControllableServiceWorker('activated'));
    stub(navigator.serviceWorker, 'register').resolves(
      asRegistration(registration)
    );

    await expect(registerDefaultSw(messaging)).to.eventually.be.fulfilled;
    expect(messaging.swRegistration).to.equal(asRegistration(registration));
  });

  it('resolves when a replacement worker activates after the observed worker becomes redundant', async () => {
    const registration = new ControllableRegistration();
    const firstWorker = new ControllableServiceWorker('installing');
    registration.installing = asWorker(firstWorker);
    stub(navigator.serviceWorker, 'register').resolves(
      asRegistration(registration)
    );

    const pending = registerDefaultSw(messaging);
    await flushMicrotasks();

    // A replacement worker appears and the originally observed worker becomes
    // redundant. The redundant worker never fires 'activated', which is the
    // exact case the SDK used to hang on until the timeout.
    const secondWorker = new ControllableServiceWorker('installing');
    registration.installing = asWorker(secondWorker);
    firstWorker.transitionTo('redundant');

    // The replacement worker activates.
    registration.active = asWorker(secondWorker);
    registration.installing = null;
    secondWorker.transitionTo('activated');

    await expect(pending).to.eventually.be.fulfilled;
  });

  it('resolves for a worker that only appears via updatefound', async () => {
    const registration = new ControllableRegistration();
    // No active/installing/waiting worker at registration time.
    stub(navigator.serviceWorker, 'register').resolves(
      asRegistration(registration)
    );

    const pending = registerDefaultSw(messaging);
    await flushMicrotasks();

    const worker = new ControllableServiceWorker('installing');
    registration.installing = asWorker(worker);
    registration.dispatchEvent(new Event('updatefound'));

    registration.active = asWorker(worker);
    registration.installing = null;
    worker.transitionTo('activated');

    await expect(pending).to.eventually.be.fulfilled;
  });

  it('rejects if no worker becomes active before the timeout', async () => {
    const clock = useFakeTimers();
    try {
      const registration = new ControllableRegistration();
      registration.installing = asWorker(
        new ControllableServiceWorker('installing')
      );
      stub(navigator.serviceWorker, 'register').resolves(
        asRegistration(registration)
      );

      const pending = registerDefaultSw(messaging);
      await clock.tickAsync(DEFAULT_REGISTRATION_TIMEOUT);

      await expect(pending).to.eventually.be.rejectedWith(
        /Service worker not registered after/
      );
    } finally {
      clock.restore();
    }
  });
});

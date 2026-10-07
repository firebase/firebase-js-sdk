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
import { spy } from 'sinon';

import { base64ToArray } from '../helpers/array-base64-translator';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { getPushSubscription } from './push-subscription';

/** base64url encoding of 'vapid-key-value'. */
const VAPID_KEY_A = 'dmFwaWQta2V5LXZhbHVl';
/** An unpadded base64url-encoded P-256 public key (contains '-' and '_'). */
const VAPID_KEY_B =
  'BFsgEwl8eIQ30RpOPT7-o2x_ojOaPcSoJUBx-vWKT7xYvUTdq3j11Dm9hctS75bJ9LKx2KJW2j8Q0wZnuUS8yVQ';
/** The same key as VAPID_KEY_B, spelled with the standard base64 alphabet and padding. */
const VAPID_KEY_B_STANDARD_PADDED =
  'BFsgEwl8eIQ30RpOPT7+o2x/ojOaPcSoJUBx+vWKT7xYvUTdq3j11Dm9hctS75bJ9LKx2KJW2j8Q0wZnuUS8yVQ=';

describe('getPushSubscription', () => {
  let swRegistration: ServiceWorkerRegistration;
  let pushManager: PushManager;

  beforeEach(() => {
    swRegistration = new FakeServiceWorkerRegistration();
    pushManager = swRegistration.pushManager;
  });

  function subscribeWithKey(vapidKey: string): Promise<PushSubscription> {
    return pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToArray(vapidKey) as unknown as BufferSource
    });
  }

  it('subscribes with the VAPID key when there is no existing subscription', async () => {
    const subscribeSpy = spy(pushManager, 'subscribe');

    const subscription = await getPushSubscription(swRegistration, VAPID_KEY_A);

    expect(subscribeSpy).to.have.been.calledOnce;
    expect(subscribeSpy.firstCall.args[0]).to.deep.equal({
      userVisibleOnly: true,
      applicationServerKey: base64ToArray(VAPID_KEY_A)
    });
    expect(await pushManager.getSubscription()).to.equal(subscription);
  });

  it('reuses the existing subscription when it was created with the same VAPID key', async () => {
    const existing = await subscribeWithKey(VAPID_KEY_A);
    const unsubscribeSpy = spy(existing, 'unsubscribe');
    const subscribeSpy = spy(pushManager, 'subscribe');

    const subscription = await getPushSubscription(swRegistration, VAPID_KEY_A);

    expect(subscription).to.equal(existing);
    expect(unsubscribeSpy).not.to.have.been.called;
    expect(subscribeSpy).not.to.have.been.called;
  });

  it('unsubscribes and re-subscribes when the existing subscription was created with a different VAPID key', async () => {
    const existing = await subscribeWithKey(VAPID_KEY_A);
    const unsubscribeSpy = spy(existing, 'unsubscribe');
    const subscribeSpy = spy(pushManager, 'subscribe');

    const subscription = await getPushSubscription(swRegistration, VAPID_KEY_B);

    expect(unsubscribeSpy).to.have.been.calledOnce;
    expect(subscribeSpy).to.have.been.calledOnce;
    expect(unsubscribeSpy).to.have.been.calledBefore(subscribeSpy);
    expect(subscribeSpy.firstCall.args[0]).to.deep.equal({
      userVisibleOnly: true,
      applicationServerKey: base64ToArray(VAPID_KEY_B)
    });
    expect(subscription).not.to.equal(existing);
    expect(
      new Uint8Array(subscription.options.applicationServerKey!)
    ).to.deep.equal(base64ToArray(VAPID_KEY_B));
    expect(await pushManager.getSubscription()).to.equal(subscription);
  });

  it('treats a padded / standard-base64 spelling of the same key as equal', async () => {
    const existing = await subscribeWithKey(VAPID_KEY_B);
    const unsubscribeSpy = spy(existing, 'unsubscribe');
    const subscribeSpy = spy(pushManager, 'subscribe');

    const subscription = await getPushSubscription(
      swRegistration,
      VAPID_KEY_B_STANDARD_PADDED
    );

    expect(subscription).to.equal(existing);
    expect(unsubscribeSpy).not.to.have.been.called;
    expect(subscribeSpy).not.to.have.been.called;
  });

  it('keeps the existing subscription when the browser does not expose applicationServerKey', async () => {
    // Subscribing without a key leaves `options.applicationServerKey` null.
    const existing = await pushManager.subscribe();
    expect(existing.options.applicationServerKey).to.be.null;
    const unsubscribeSpy = spy(existing, 'unsubscribe');
    const subscribeSpy = spy(pushManager, 'subscribe');

    const subscription = await getPushSubscription(swRegistration, VAPID_KEY_B);

    expect(subscription).to.equal(existing);
    expect(unsubscribeSpy).not.to.have.been.called;
    expect(subscribeSpy).not.to.have.been.called;
  });
});

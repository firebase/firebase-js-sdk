/**
 * @license
 * Copyright 2019 Google LLC
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
import { SinonStub, stub } from 'sinon';
import '../testing/setup';
import {
  setCurrentScreen,
  logEvent,
  setUserId,
  setUserProperties,
  setAnalyticsCollectionEnabled
} from './functions';
import { GtagCommand, EventName } from './constants';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeInitializationPromise = Promise.resolve(fakeMeasurementId);

describe('FirebaseAnalytics methods', () => {
  const gtagStub: SinonStub = stub();

  afterEach(() => {
    gtagStub.reset();
  });

  it('logEvent() calls gtag function correctly', async () => {
    await logEvent(gtagStub, fakeInitializationPromise, EventName.ADD_TO_CART, {
      currency: 'USD'
    });

    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.EVENT,
      EventName.ADD_TO_CART,
      {
        'send_to': fakeMeasurementId,
        currency: 'USD'
      }
    );
  });

  it('logEvent() with no event params calls gtag function correctly', async () => {
    await logEvent(gtagStub, fakeInitializationPromise, EventName.VIEW_ITEM);

    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.EVENT,
      EventName.VIEW_ITEM,
      {
        'send_to': fakeMeasurementId
      }
    );
  });

  it('logEvent() globally calls gtag function correctly', async () => {
    await logEvent(
      gtagStub,
      fakeInitializationPromise,
      EventName.ADD_TO_CART,
      {
        currency: 'USD'
      },
      { global: true }
    );

    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.EVENT,
      EventName.ADD_TO_CART,
      {
        currency: 'USD'
      }
    );
  });

  it('logEvent() with no event params globally calls gtag function correctly', async () => {
    await logEvent(
      gtagStub,
      fakeInitializationPromise,
      EventName.ADD_TO_CART,
      undefined,
      {
        global: true
      }
    );

    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.EVENT,
      EventName.ADD_TO_CART,
      undefined
    );
  });

  it('setCurrentScreen() calls gtag correctly (instance)', async () => {
    await setCurrentScreen(gtagStub, fakeInitializationPromise, 'home');
    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.CONFIG,
      fakeMeasurementId,
      {
        'screen_name': 'home',
        update: true
      }
    );
  });

  it('setCurrentScreen() calls gtag correctly (global)', async () => {
    await setCurrentScreen(gtagStub, fakeInitializationPromise, 'home', {
      global: true
    });
    expect(gtagStub).to.be.calledWith(GtagCommand.SET, {
      'screen_name': 'home'
    });
  });

  it('setUserId() calls gtag correctly (instance)', async () => {
    await setUserId(gtagStub, fakeInitializationPromise, 'user123');
    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.CONFIG,
      fakeMeasurementId,
      {
        'user_id': 'user123',
        update: true
      }
    );
  });

  it('setUserId() calls gtag correctly (global)', async () => {
    await setUserId(gtagStub, fakeInitializationPromise, 'user123', {
      global: true
    });
    expect(gtagStub).to.be.calledWith(GtagCommand.SET, {
      'user_id': 'user123'
    });
  });

  it('setUserProperties() calls gtag correctly (instance)', async () => {
    await setUserProperties(gtagStub, fakeInitializationPromise, {
      'currency': 'USD',
      'language': 'en'
    });
    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.CONFIG,
      fakeMeasurementId,
      {
        'user_properties': {
          'currency': 'USD',
          'language': 'en'
        },
        update: true
      }
    );
  });

  it('setUserProperties() calls gtag correctly (global)', async () => {
    await setUserProperties(
      gtagStub,
      fakeInitializationPromise,
      { 'currency': 'USD', 'language': 'en' },
      { global: true }
    );
    expect(gtagStub).to.be.calledWith(GtagCommand.SET, {
      'user_properties.currency': 'USD',
      'user_properties.language': 'en'
    });
  });

  it('setAnalyticsCollectionEnabled() calls gtag correctly', async () => {
    await setAnalyticsCollectionEnabled(fakeInitializationPromise, true);
    expect(window[`ga-disable-${fakeMeasurementId}`]).to.be.false;
    await setAnalyticsCollectionEnabled(fakeInitializationPromise, false);
    expect(window[`ga-disable-${fakeMeasurementId}`]).to.be.true;
    delete window[`ga-disable-${fakeMeasurementId}`];
  });
});

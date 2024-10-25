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
  setAnalyticsCollectionEnabled,
  defaultEventParametersForInit,
  _setDefaultEventParametersForInit,
  _setConsentDefaultForInit,
  defaultConsentSettingsForInit,
  internalGetGoogleAnalyticsClientId
} from './functions';
import { GtagCommand } from './constants';
import { ConsentSettings } from './public-types';
import { Gtag } from './types';
import { AnalyticsError } from './errors';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeInitializationPromise = Promise.resolve(fakeMeasurementId);

describe('FirebaseAnalytics methods', () => {
  const gtagStub: SinonStub = stub();

  afterEach(() => {
    gtagStub.reset();
  });

  it('logEvent() calls gtag function correctly', async () => {
    await logEvent(gtagStub, fakeInitializationPromise, 'add_to_cart', {
      currency: 'USD'
    });

    expect(gtagStub).to.have.been.calledWith(GtagCommand.EVENT, 'add_to_cart', {
      'send_to': fakeMeasurementId,
      currency: 'USD'
    });
  });

  it('logEvent() with no event params calls gtag function correctly', async () => {
    await logEvent(gtagStub, fakeInitializationPromise, 'view_item');

    expect(gtagStub).to.have.been.calledWith(GtagCommand.EVENT, 'view_item', {
      'send_to': fakeMeasurementId
    });
  });

  it('logEvent() globally calls gtag function correctly', async () => {
    await logEvent(
      gtagStub,
      fakeInitializationPromise,
      'add_to_cart',
      {
        currency: 'USD'
      },
      { global: true }
    );

    expect(gtagStub).to.have.been.calledWith(GtagCommand.EVENT, 'add_to_cart', {
      currency: 'USD'
    });
  });

  it('logEvent() with no event params globally calls gtag function correctly', async () => {
    await logEvent(
      gtagStub,
      fakeInitializationPromise,
      'add_to_cart',
      undefined,
      {
        global: true
      }
    );

    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.EVENT,
      'add_to_cart',
      undefined
    );
  });

  it('setCurrentScreen() (deprecated) calls gtag correctly (instance)', async () => {
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

  it('setCurrentScreen() (deprecated) calls gtag correctly (global)', async () => {
    await setCurrentScreen(gtagStub, fakeInitializationPromise, 'home', {
      global: true
    });
    expect(gtagStub).to.be.calledWith(GtagCommand.SET, {
      'screen_name': 'home'
    });
  });

  it('setUserId() with null (user) id calls gtag correctly (instance)', async () => {
    await setUserId(gtagStub, fakeInitializationPromise, null);
    expect(gtagStub).to.have.been.calledWith(
      GtagCommand.CONFIG,
      fakeMeasurementId,
      {
        'user_id': null,
        update: true
      }
    );
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

  it('setUserId() with null (user) id calls gtag correctly (global)', async () => {
    await setUserId(gtagStub, fakeInitializationPromise, null, {
      global: true
    });
    expect(gtagStub).to.be.calledWith(GtagCommand.SET, {
      'user_id': null
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
  it('_setDefaultEventParametersForInit() stores individual params correctly', async () => {
    const eventParametersForInit = {
      'github_user': 'dwyfrequency',
      'company': 'google'
    };
    _setDefaultEventParametersForInit(eventParametersForInit);
    expect(defaultEventParametersForInit).to.deep.equal(eventParametersForInit);
  });
  it('_setDefaultEventParametersForInit() replaces previous params with new params', async () => {
    const eventParametersForInit = {
      'github_user': 'dwyfrequency',
      'company': 'google'
    };
    const additionalParams = { 'food': 'sushi' };
    _setDefaultEventParametersForInit(eventParametersForInit);
    _setDefaultEventParametersForInit(additionalParams);
    expect(defaultEventParametersForInit).to.deep.equal({
      ...additionalParams
    });
  });
  it('_setConsentDefaultForInit() stores individual params correctly', async () => {
    const consentParametersForInit: ConsentSettings = {
      'analytics_storage': 'granted',
      'functionality_storage': 'denied'
    };
    _setConsentDefaultForInit(consentParametersForInit);
    expect(defaultConsentSettingsForInit).to.deep.equal(
      consentParametersForInit
    );
  });
  it('_setConsentDefaultForInit() replaces previous params with new params', async () => {
    const consentParametersForInit: ConsentSettings = {
      'analytics_storage': 'granted',
      'functionality_storage': 'denied'
    };
    const additionalParams = { 'wait_for_update': 500 };
    _setConsentDefaultForInit(consentParametersForInit);
    _setConsentDefaultForInit(additionalParams);
    expect(defaultConsentSettingsForInit).to.deep.equal({
      ...additionalParams
    });
  });
  it('internalGetGoogleAnalyticsClientId() rejects when no client_id is available', async () => {
    await expect(
      internalGetGoogleAnalyticsClientId(
        function fakeWrappedGtag(
          unused1: unknown,
          unused2: unknown,
          unused3: unknown,
          callBackStub: (clientId: string) => {}
        ): void {
          callBackStub('');
        } as Gtag,
        fakeInitializationPromise
      )
    ).to.be.rejectedWith(AnalyticsError.NO_CLIENT_ID);
  });
  it('internalGetGoogleAnalyticsClientId() returns client_id when available', async () => {
    const CLIENT_ID = 'clientId1234';
    const id = await internalGetGoogleAnalyticsClientId(
      function fakeWrappedGtag(
        unused1: unknown,
        unused2: unknown,
        unused3: unknown,
        callBackStub: (clientId: string) => {}
      ): void {
        callBackStub(CLIENT_ID);
      } as Gtag,
      fakeInitializationPromise
    );
    expect(id).to.equal(CLIENT_ID);
  });
});

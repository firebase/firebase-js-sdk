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

import { expect, vi, MockInstance } from 'vitest';
import '../testing/setup';
import { DataLayer, Gtag, DynamicConfig } from './types';
import {
  getOrCreateDataLayer,
  insertScriptTag,
  wrapOrCreateGtag,
  findGtagScriptOnPage,
  promiseAllSettled,
  createGtagTrustedTypesScriptURL,
  createTrustedTypesPolicy
} from './helpers';
import { GtagCommand, GTAG_URL } from './constants';
import { Deferred } from '@firebase/util';
import { ConsentSettings } from './public-types';
import { removeGtagScripts } from '../testing/gtag-script-util';
import { logger } from './logger';
import { AnalyticsError, ERROR_FACTORY } from './errors';

const fakeMeasurementId = 'abcd-efgh-ijkl';
const fakeAppId = 'my-test-app-1234';
const fakeDynamicConfig: DynamicConfig = {
  projectId: '---',
  appId: fakeAppId,
  databaseURL: '---',
  storageBucket: '---',
  locationId: '---',
  apiKey: '---',
  authDomain: '---',
  messagingSenderId: '---',
  measurementId: fakeMeasurementId
};
const fakeDynamicConfigPromises = [Promise.resolve(fakeDynamicConfig)];

describe('Trusted Types policies and functions', () => {
  if (window.trustedTypes) {
    describe('Trusted types exists', () => {
      let ttStub: MockInstance;

      beforeEach(() => {
        ttStub = vi
          .spyOn(
            window.trustedTypes as TrustedTypePolicyFactory,
            'createPolicy'
          )
          .mockReturnValue({
            createScriptURL: (s: string) => s
          } as any);
      });

      afterEach(() => {
        removeGtagScripts();
        ttStub.mockRestore();
      });

      it('Verify trustedTypes is called if the API is available', () => {
        const trustedTypesPolicy = createTrustedTypesPolicy(
          'firebase-js-sdk-policy',
          {
            createScriptURL: createGtagTrustedTypesScriptURL
          }
        );

        expect(ttStub).toHaveBeenCalled();
        expect(trustedTypesPolicy).toBeDefined();
      });

      it('createGtagTrustedTypesScriptURL verifies gtag URL base exists when a URL is provided', () => {
        expect(createGtagTrustedTypesScriptURL(GTAG_URL)).toBe(GTAG_URL);
      });

      it('createGtagTrustedTypesScriptURL rejects URLs with non-gtag base', () => {
        const NON_GTAG_URL = 'http://iamnotgtag.com';
        const loggerWarnStub = vi.spyOn(logger, 'warn');
        const errorMessage = ERROR_FACTORY.create(
          AnalyticsError.INVALID_GTAG_RESOURCE,
          {
            gtagURL: NON_GTAG_URL
          }
        ).message;

        expect(createGtagTrustedTypesScriptURL(NON_GTAG_URL)).toBe('');
        expect(loggerWarnStub).toHaveBeenCalledWith(errorMessage);
      });
    });
  }
  describe('Trusted types does not exist', () => {
    it('Verify trustedTypes functions are not called if the API is not available', () => {
      delete window.trustedTypes;
      const trustedTypesPolicy = createTrustedTypesPolicy(
        'firebase-js-sdk-policy',
        {
          createScriptURL: createGtagTrustedTypesScriptURL
        }
      );

      expect(trustedTypesPolicy).toBeUndefined();
    });
  });
});

describe('Gtag wrapping functions', () => {
  afterEach(() => {
    removeGtagScripts();
  });

  it('getOrCreateDataLayer is able to create a new data layer if none exists', () => {
    delete window['dataLayer'];
    expect(getOrCreateDataLayer('dataLayer')).toEqual([]);
  });

  it('getOrCreateDataLayer is able to correctly identify an existing data layer', () => {
    const existingDataLayer = (window['dataLayer'] = []);
    expect(getOrCreateDataLayer('dataLayer')).toBe(existingDataLayer);
  });

  it('insertScriptIfNeeded inserts script tag', () => {
    const customDataLayerName = 'customDataLayerName';
    expect(findGtagScriptOnPage(customDataLayerName)).toBeNull();
    insertScriptTag(customDataLayerName, fakeMeasurementId);
    const scriptTag = findGtagScriptOnPage(customDataLayerName);
    expect(scriptTag).not.toBeNull();
    expect(scriptTag!.src).toContain(`l=customDataLayerName`);
    expect(scriptTag!.src).toContain(`id=${fakeMeasurementId}`);
  });

  // The test above essentially already touches this functionality but it is still valuable
  it('findGtagScriptOnPage returns gtag instance with matching data layer name', () => {
    const defaultDataLayerName = 'dataLayer';
    insertScriptTag(defaultDataLayerName, fakeMeasurementId);
    const scriptTag = findGtagScriptOnPage(defaultDataLayerName);
    expect(scriptTag!.src).toContain(`l=${defaultDataLayerName}`);
    expect(findGtagScriptOnPage('NON_EXISTENT_DATA_LAYER_ID')).toBeNull();
  });

  describe('wrapOrCreateGtag() when user has not previously inserted a gtag script tag on this page', () => {
    afterEach(() => {
      delete window['gtag'];
      delete window['dataLayer'];
    });

    it('wrapOrCreateGtag creates new gtag function if needed', () => {
      expect(window['gtag']).toBeFalsy();
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      expect(window['gtag']).toBeDefined();
    });

    it('new window.gtag function waits for all initialization promises before sending group events', async () => {
      const initPromise1 = new Deferred<string>();
      const initPromise2 = new Deferred<string>();
      wrapOrCreateGtag(
        {
          [fakeAppId]: initPromise1.promise,
          otherId: initPromise2.promise
        },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      const eventObject = {
        'transaction_id': 'abcd123',
        'send_to': 'some_group'
      };
      (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', eventObject);
      expect((window['dataLayer'] as DataLayer).length).toBe(0);

      initPromise1.resolve(fakeMeasurementId); // Resolves first initialization promise.
      expect((window['dataLayer'] as DataLayer).length).toBe(0);

      initPromise2.resolve('other-measurement-id'); // Resolves second initialization promise.
      await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()
      await promiseAllSettled(fakeDynamicConfigPromises);
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('event');
      expect(data[1]).toBe('purchase');
      expect(data[2]).toBe(eventObject);
    });

    it(
      'new window.gtag function waits for all initialization promises before sending ' +
        'event with at least one unknown send_to ID',
      async () => {
        const initPromise1 = new Deferred<string>();
        const initPromise2 = new Deferred<string>();
        wrapOrCreateGtag(
          {
            [fakeAppId]: initPromise1.promise,
            otherId: initPromise2.promise
          },
          fakeDynamicConfigPromises,
          { [fakeMeasurementId]: fakeAppId },
          'dataLayer',
          'gtag'
        );
        window['dataLayer'] = [];
        const eventObject = {
          'transaction_id': 'abcd123',
          'send_to': [fakeMeasurementId, 'some_group']
        };
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', eventObject);
        expect((window['dataLayer'] as DataLayer).length).toBe(0);

        initPromise1.resolve(); // Resolves first initialization promise.
        expect((window['dataLayer'] as DataLayer).length).toBe(0);

        initPromise2.resolve(); // Resolves second initialization promise.
        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()
        await promiseAllSettled(fakeDynamicConfigPromises);

        const dataLayer = window['dataLayer'] as DataLayer;
        expect(dataLayer.length).toBe(1);
        const data = dataLayer[0];
        expect(data[0]).toBe('event');
        expect(data[1]).toBe('purchase');
        expect(data[2]).toBe(eventObject);
      }
    );

    it(
      'new window.gtag function waits for all initialization promises before sending ' +
        'events with no send_to field',
      async () => {
        const initPromise1 = new Deferred<string>();
        const initPromise2 = new Deferred<string>();
        wrapOrCreateGtag(
          {
            [fakeAppId]: initPromise1.promise,
            otherId: initPromise2.promise
          },
          fakeDynamicConfigPromises,
          { [fakeMeasurementId]: fakeAppId },
          'dataLayer',
          'gtag'
        );
        window['dataLayer'] = [];
        const eventObject = {
          'transaction_id': 'abcd123'
        };
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', eventObject);
        expect((window['dataLayer'] as DataLayer).length).toBe(0);

        initPromise1.resolve(); // Resolves first initialization promise.
        expect((window['dataLayer'] as DataLayer).length).toBe(0);

        initPromise2.resolve(); // Resolves second initialization promise.
        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

        const dataLayer = window['dataLayer'] as DataLayer;
        expect(dataLayer.length).toBe(1);
        const data = dataLayer[0];
        expect(data[0]).toBe('event');
        expect(data[1]).toBe('purchase');
        expect(data[2]).toBe(eventObject);
      }
    );

    it(
      'new window.gtag function only waits for firebase initialization promise ' +
        'before sending event only targeted to Firebase instance GA ID',
      async () => {
        const initPromise1 = new Deferred<string>();
        const initPromise2 = new Deferred<string>();
        wrapOrCreateGtag(
          {
            [fakeAppId]: initPromise1.promise,
            otherId: initPromise2.promise
          },
          fakeDynamicConfigPromises,
          { [fakeMeasurementId]: fakeAppId },
          'dataLayer',
          'gtag'
        );
        window['dataLayer'] = [];
        const eventObject = {
          'transaction_id': 'abcd123',
          'send_to': fakeMeasurementId
        };
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', eventObject);
        expect((window['dataLayer'] as DataLayer).length).toBe(0);

        initPromise1.resolve(); // Resolves first initialization promise.
        await promiseAllSettled(fakeDynamicConfigPromises);
        await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

        const dataLayer = window['dataLayer'] as DataLayer;
        expect(dataLayer.length).toBe(1);
        const data = dataLayer[0];
        expect(data[0]).toBe('event');
        expect(data[1]).toBe('purchase');
        expect(data[2]).toBe(eventObject);
      }
    );

    it('new window.gtag function does not wait before sending events if there are no pending initialization promises', async () => {
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
        'transaction_id': 'abcd123'
      });
      await Promise.all([]); // Promise.all() always runs before event call, even if empty.
      expect((window['dataLayer'] as DataLayer).length).toBe(1);
    });

    it('new window.gtag function does not wait when sending "set" calls', async () => {
      wrapOrCreateGtag(
        { [fakeAppId]: Promise.resolve(fakeMeasurementId) },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      const eventObject = { 'language': 'en' };
      (window['gtag'] as Gtag)(GtagCommand.SET, eventObject);
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('set');
      expect(data[1]).toBe(eventObject);
    });

    it('new window.gtag function does not wait when sending "consent" calls', async () => {
      const consentParameters: ConsentSettings = {
        'analytics_storage': 'granted',
        'functionality_storage': 'denied'
      };
      wrapOrCreateGtag(
        { [fakeAppId]: Promise.resolve(fakeMeasurementId) },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(
        GtagCommand.CONSENT,
        'update',
        consentParameters
      );
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('consent');
      expect(data[1]).toBe('update');
      expect(data[2]).toBe(consentParameters);
    });

    it('new window.gtag function does not wait when sending "get" calls', async () => {
      wrapOrCreateGtag(
        { [fakeAppId]: Promise.resolve(fakeMeasurementId) },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(
        GtagCommand.GET,
        fakeMeasurementId,
        'client_id',
        clientId => console.log(clientId)
      );
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('get');
      expect(data[1]).toBe(fakeMeasurementId);
      expect(data[2]).toBe('client_id');
      expect(data[3]).toBeDefined();
    });

    it('new window.gtag function does not wait when sending an unknown command', async () => {
      wrapOrCreateGtag(
        { [fakeAppId]: Promise.resolve(fakeMeasurementId) },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)('new-command-from-gtag-team', fakeMeasurementId);
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('new-command-from-gtag-team');
      expect(data[1]).toBe(fakeMeasurementId);
    });

    it('new window.gtag function waits for initialization promise when sending "config" calls', async () => {
      const initPromise1 = new Deferred<string>();
      wrapOrCreateGtag(
        { [fakeAppId]: initPromise1.promise },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      const eventObject = {
        'language': 'en'
      };
      (window['gtag'] as Gtag)(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        eventObject
      );
      expect((window['dataLayer'] as DataLayer).length).toBe(0);

      initPromise1.resolve(fakeMeasurementId);
      await promiseAllSettled(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect((window['dataLayer'] as DataLayer).length).toBe(0);

      await Promise.all([initPromise1]); // Wait for resolution of Promise.all()
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('config');
      expect(data[1]).toBe(fakeMeasurementId);
      expect(data[2]).toBe(eventObject);
    });

    it('new window.gtag function does not wait when sending "config" calls if there are no pending initialization promises', async () => {
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      window['dataLayer'] = [];
      const eventObject = {
        'transaction_id': 'abcd123'
      };
      (window['gtag'] as Gtag)(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        eventObject
      );
      await promiseAllSettled(fakeDynamicConfigPromises);
      await Promise.resolve(); // Config call is always chained onto initialization promise list, even if empty.
      const dataLayer = window['dataLayer'] as DataLayer;
      expect(dataLayer.length).toBe(1);
      const data = dataLayer[0];
      expect(data[0]).toBe('config');
      expect(data[1]).toBe(fakeMeasurementId);
      expect(data[2]).toBe(eventObject);
    });
  });

  describe('wrapOrCreateGtag() when user has previously inserted gtag script tag on this page', () => {
    const existingGtagStub: MockInstance = vi.fn();

    beforeEach(() => {
      window['gtag'] = existingGtagStub;
    });

    afterEach(() => {
      existingGtagStub.mockReset();
    });

    it('new window.gtag function waits for all initialization promises before sending group events', async () => {
      const initPromise1 = new Deferred<string>();
      const initPromise2 = new Deferred<string>();
      wrapOrCreateGtag(
        {
          [fakeAppId]: initPromise1.promise,
          otherId: initPromise2.promise
        },
        fakeDynamicConfigPromises,
        { [fakeMeasurementId]: fakeAppId },
        'dataLayer',
        'gtag'
      );
      (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
        'transaction_id': 'abcd123',
        'send_to': 'some_group'
      });
      expect(existingGtagStub).not.toHaveBeenCalled();

      initPromise1.resolve(); // Resolves first initialization promise.
      expect(existingGtagStub).not.toHaveBeenCalled();

      initPromise2.resolve(); // Resolves second initialization promise.
      await promiseAllSettled(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect(existingGtagStub).not.toHaveBeenCalled();

      await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

      expect(existingGtagStub).toHaveBeenCalledWith(
        GtagCommand.EVENT,
        'purchase',
        {
          'send_to': 'some_group',
          'transaction_id': 'abcd123'
        }
      );
    });

    it(
      'new window.gtag function waits for all initialization promises before sending ' +
        'event with at least one unknown send_to ID',
      async () => {
        const initPromise1 = new Deferred<string>();
        const initPromise2 = new Deferred<string>();
        wrapOrCreateGtag(
          {
            [fakeAppId]: initPromise1.promise,
            otherId: initPromise2.promise
          },
          fakeDynamicConfigPromises,
          { [fakeMeasurementId]: fakeAppId },
          'dataLayer',
          'gtag'
        );
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
          'transaction_id': 'abcd123',
          'send_to': [fakeMeasurementId, 'some_group']
        });
        expect(existingGtagStub).not.toHaveBeenCalled();

        initPromise1.resolve(); // Resolves first initialization promise.
        expect(existingGtagStub).not.toHaveBeenCalled();

        initPromise2.resolve(); // Resolves second initialization promise.
        await promiseAllSettled(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
        expect(existingGtagStub).not.toHaveBeenCalled();

        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

        expect(existingGtagStub).toHaveBeenCalledWith(
          GtagCommand.EVENT,
          'purchase',
          {
            'send_to': [fakeMeasurementId, 'some_group'],
            'transaction_id': 'abcd123'
          }
        );
      }
    );

    it(
      'new window.gtag function waits for all initialization promises before sending ' +
        'events with no send_to field',
      async () => {
        const initPromise1 = new Deferred<string>();
        const initPromise2 = new Deferred<string>();
        wrapOrCreateGtag(
          {
            [fakeAppId]: initPromise1.promise,
            otherId: initPromise2.promise
          },
          fakeDynamicConfigPromises,
          { [fakeMeasurementId]: fakeAppId },
          'dataLayer',
          'gtag'
        );
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
          'transaction_id': 'abcd123'
        });
        expect(existingGtagStub).not.toHaveBeenCalled();

        initPromise1.resolve(); // Resolves first initialization promise.
        expect(existingGtagStub).not.toHaveBeenCalled();

        initPromise2.resolve(); // Resolves second initialization promise.

        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

        expect(existingGtagStub).toHaveBeenCalledWith(
          GtagCommand.EVENT,
          'purchase',
          { 'transaction_id': 'abcd123' }
        );
      }
    );

    it(
      'new window.gtag function only waits for firebase initialization promise ' +
        'before sending event only targeted to Firebase instance GA ID',
      async () => {
        const initPromise1 = new Deferred<string>();
        const initPromise2 = new Deferred<string>();
        wrapOrCreateGtag(
          {
            [fakeAppId]: initPromise1.promise,
            otherId: initPromise2.promise
          },
          fakeDynamicConfigPromises,
          { [fakeMeasurementId]: fakeAppId },
          'dataLayer',
          'gtag'
        );
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
          'transaction_id': 'abcd123',
          'send_to': fakeMeasurementId
        });
        expect(existingGtagStub).not.toHaveBeenCalled();

        initPromise1.resolve(); // Resolves first initialization promise.
        await promiseAllSettled(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
        expect(existingGtagStub).not.toHaveBeenCalled();

        await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

        expect(existingGtagStub).toHaveBeenCalledWith(
          GtagCommand.EVENT,
          'purchase',
          { 'send_to': fakeMeasurementId, 'transaction_id': 'abcd123' }
        );
      }
    );

    it('wrapped window.gtag function does not wait if there are no pending initialization promises', async () => {
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
        'transaction_id': 'abcd321'
      });
      await Promise.all([]); // Promise.all() always runs before event call, even if empty.
      expect(existingGtagStub).toHaveBeenCalledWith(
        GtagCommand.EVENT,
        'purchase',
        {
          'transaction_id': 'abcd321'
        }
      );
    });

    it('wrapped window.gtag function does not wait when sending "set" calls', async () => {
      wrapOrCreateGtag(
        { [fakeAppId]: Promise.resolve(fakeMeasurementId) },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.SET, { 'language': 'en' });
      expect(existingGtagStub).toHaveBeenCalledWith(GtagCommand.SET, {
        'language': 'en'
      });
    });

    it('new window.gtag function waits for initialization promise when sending "config" calls', async () => {
      const initPromise1 = new Deferred<string>();
      wrapOrCreateGtag(
        { [fakeAppId]: initPromise1.promise },
        fakeDynamicConfigPromises,
        {},
        'dataLayer',
        'gtag'
      );
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.CONFIG, fakeMeasurementId, {
        'language': 'en'
      });
      expect(existingGtagStub).not.toHaveBeenCalled();

      initPromise1.resolve(fakeMeasurementId);
      await promiseAllSettled(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect(existingGtagStub).not.toHaveBeenCalled();

      await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

      expect(existingGtagStub).toHaveBeenCalledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'language': 'en'
        }
      );
    });

    it('new window.gtag function does not wait when sending "config" calls if there are no pending initialization promises', async () => {
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.CONFIG, fakeMeasurementId, {
        'transaction_id': 'abcd123'
      });
      await promiseAllSettled(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect(existingGtagStub).not.toHaveBeenCalled();
      await Promise.resolve(); // Config call is always chained onto initialization promise list, even if empty.
      expect(existingGtagStub).toHaveBeenCalledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'transaction_id': 'abcd123'
        }
      );
    });
  });
});

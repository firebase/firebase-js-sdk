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
import { DataLayer, Gtag, DynamicConfig } from '@firebase/analytics-types';
import {
  getOrCreateDataLayer,
  insertScriptTag,
  wrapOrCreateGtag,
  findGtagScriptOnPage
} from './helpers';
import { GtagCommand } from './constants';
import { Deferred } from '@firebase/util';

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

describe('Gtag wrapping functions', () => {
  it('getOrCreateDataLayer is able to create a new data layer if none exists', () => {
    delete window['dataLayer'];
    expect(getOrCreateDataLayer('dataLayer')).to.deep.equal([]);
  });

  it('getOrCreateDataLayer is able to correctly identify an existing data layer', () => {
    const existingDataLayer = (window['dataLayer'] = []);
    expect(getOrCreateDataLayer('dataLayer')).to.equal(existingDataLayer);
  });

  it('insertScriptIfNeeded inserts script tag', () => {
    expect(findGtagScriptOnPage()).to.be.null;
    insertScriptTag('customDataLayerName');
    const scriptTag = findGtagScriptOnPage();
    expect(scriptTag).to.not.be.null;
    expect(scriptTag!.src).to.contain(`l=customDataLayerName`);
  });

  describe('wrapOrCreateGtag() when user has not previously inserted a gtag script tag on this page', () => {
    afterEach(() => {
      delete window['gtag'];
      delete window['dataLayer'];
    });

    it('wrapOrCreateGtag creates new gtag function if needed', () => {
      expect(window['gtag']).to.not.exist;
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      expect(window['gtag']).to.exist;
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
      (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
        'transaction_id': 'abcd123',
        'send_to': 'some_group'
      });
      expect((window['dataLayer'] as DataLayer).length).to.equal(0);

      initPromise1.resolve(fakeMeasurementId); // Resolves first initialization promise.
      expect((window['dataLayer'] as DataLayer).length).to.equal(0);

      initPromise2.resolve('other-measurement-id'); // Resolves second initialization promise.
      await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()
      await Promise.all(fakeDynamicConfigPromises);

      expect((window['dataLayer'] as DataLayer).length).to.equal(1);
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
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
          'transaction_id': 'abcd123',
          'send_to': [fakeMeasurementId, 'some_group']
        });
        expect((window['dataLayer'] as DataLayer).length).to.equal(0);

        initPromise1.resolve(); // Resolves first initialization promise.
        expect((window['dataLayer'] as DataLayer).length).to.equal(0);

        initPromise2.resolve(); // Resolves second initialization promise.
        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()
        await Promise.all(fakeDynamicConfigPromises);

        expect((window['dataLayer'] as DataLayer).length).to.equal(1);
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
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
          'transaction_id': 'abcd123'
        });
        expect((window['dataLayer'] as DataLayer).length).to.equal(0);

        initPromise1.resolve(); // Resolves first initialization promise.
        expect((window['dataLayer'] as DataLayer).length).to.equal(0);

        initPromise2.resolve(); // Resolves second initialization promise.
        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

        expect((window['dataLayer'] as DataLayer).length).to.equal(1);
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
        (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
          'transaction_id': 'abcd123',
          'send_to': fakeMeasurementId
        });
        expect((window['dataLayer'] as DataLayer).length).to.equal(0);

        initPromise1.resolve(); // Resolves first initialization promise.
        await Promise.all(fakeDynamicConfigPromises);
        await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

        expect((window['dataLayer'] as DataLayer).length).to.equal(1);
      }
    );

    it('new window.gtag function does not wait before sending events if there are no pending initialization promises', async () => {
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.EVENT, 'purchase', {
        'transaction_id': 'abcd123'
      });
      await Promise.all([]); // Promise.all() always runs before event call, even if empty.
      expect((window['dataLayer'] as DataLayer).length).to.equal(1);
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
      (window['gtag'] as Gtag)(GtagCommand.SET, { 'language': 'en' });
      expect((window['dataLayer'] as DataLayer).length).to.equal(1);
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
      expect((window['dataLayer'] as DataLayer).length).to.equal(0);

      initPromise1.resolve(fakeMeasurementId);
      await Promise.all(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect((window['dataLayer'] as DataLayer).length).to.equal(0);

      await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

      expect((window['dataLayer'] as DataLayer).length).to.equal(1);
    });

    it('new window.gtag function does not wait when sending "config" calls if there are no pending initialization promises', async () => {
      wrapOrCreateGtag({}, fakeDynamicConfigPromises, {}, 'dataLayer', 'gtag');
      window['dataLayer'] = [];
      (window['gtag'] as Gtag)(GtagCommand.CONFIG, fakeMeasurementId, {
        'transaction_id': 'abcd123'
      });
      await Promise.all(fakeDynamicConfigPromises);
      await Promise.resolve(); // Config call is always chained onto initialization promise list, even if empty.
      expect((window['dataLayer'] as DataLayer).length).to.equal(1);
    });
  });

  describe('wrapOrCreateGtag() when user has previously inserted gtag script tag on this page', () => {
    const existingGtagStub: SinonStub = stub();

    beforeEach(() => {
      window['gtag'] = existingGtagStub;
    });

    afterEach(() => {
      existingGtagStub.reset();
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
      expect(existingGtagStub).to.not.be.called;

      initPromise1.resolve(); // Resolves first initialization promise.
      expect(existingGtagStub).to.not.be.called;

      initPromise2.resolve(); // Resolves second initialization promise.
      await Promise.all(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect(existingGtagStub).to.not.be.called;

      await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

      expect(existingGtagStub).to.be.calledWith(GtagCommand.EVENT, 'purchase', {
        'send_to': 'some_group',
        'transaction_id': 'abcd123'
      });
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
        expect(existingGtagStub).to.not.be.called;

        initPromise1.resolve(); // Resolves first initialization promise.
        expect(existingGtagStub).to.not.be.called;

        initPromise2.resolve(); // Resolves second initialization promise.
        await Promise.all(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
        expect(existingGtagStub).to.not.be.called;

        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

        expect(existingGtagStub).to.be.calledWith(
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
        expect(existingGtagStub).to.not.be.called;

        initPromise1.resolve(); // Resolves first initialization promise.
        expect(existingGtagStub).to.not.be.called;

        initPromise2.resolve(); // Resolves second initialization promise.

        await Promise.all([initPromise1, initPromise2]); // Wait for resolution of Promise.all()

        expect(existingGtagStub).to.be.calledWith(
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
        expect(existingGtagStub).to.not.be.called;

        initPromise1.resolve(); // Resolves first initialization promise.
        await Promise.all(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
        expect(existingGtagStub).to.not.be.called;

        await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

        expect(existingGtagStub).to.be.calledWith(
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
      expect(existingGtagStub).to.be.calledWith(GtagCommand.EVENT, 'purchase', {
        'transaction_id': 'abcd321'
      });
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
      expect(existingGtagStub).to.be.calledWith(GtagCommand.SET, {
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
      expect(existingGtagStub).to.not.be.called;

      initPromise1.resolve(fakeMeasurementId);
      await Promise.all(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect(existingGtagStub).to.not.be.called;

      await Promise.all([initPromise1]); // Wait for resolution of Promise.all()

      expect(existingGtagStub).to.be.calledWith(
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
      await Promise.all(fakeDynamicConfigPromises); // Resolves dynamic config fetches.
      expect(existingGtagStub).to.not.be.called;
      await Promise.resolve(); // Config call is always chained onto initialization promise list, even if empty.
      expect(existingGtagStub).to.be.calledWith(
        GtagCommand.CONFIG,
        fakeMeasurementId,
        {
          'transaction_id': 'abcd123'
        }
      );
    });
  });
});

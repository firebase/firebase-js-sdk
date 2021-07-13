/**
 * @license
 * Copyright 2020 Google LLC
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

import { initializeApp, deleteApp, FirebaseApp } from '@firebase/app-exp';
import '@firebase/installations-exp';
import { getAnalytics, initializeAnalytics, logEvent } from '../../src/index';
import '../setup';
import { expect } from 'chai';
import { stub } from 'sinon';
import { AnalyticsError } from '../../src/errors';

let config: Record<string, string>;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  config = require('../../../../config/project.json');
} catch (e) {
  throw new Error(
    "Couldn't find config/project.json, make sure you ran test:setup."
  );
}

const RETRY_INTERVAL = 1000;
const TIMEOUT_MILLIS = 20000;

async function checkForEventCalls(retryCount = 0): Promise<PerformanceEntry[]> {
  if (retryCount > TIMEOUT_MILLIS / RETRY_INTERVAL) {
    return Promise.resolve([]);
  }
  await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  const resources = performance.getEntriesByType('resource');
  performance.clearResourceTimings();
  const callsWithEvent = resources.filter(
    resource =>
      resource.name.includes('google-analytics.com') &&
      resource.name.includes('en=login')
  );
  if (callsWithEvent.length === 0) {
    return checkForEventCalls(retryCount + 1);
  } else {
    return callsWithEvent;
  }
}

describe('FirebaseAnalytics Integration Smoke Tests', () => {
  let app: FirebaseApp;
  describe('Using getAnalytics()', () => {
    afterEach(() => deleteApp(app));
    it('logEvent() sends correct network request.', async () => {
      app = initializeApp(config);
      logEvent(getAnalytics(app), 'login', { method: 'phone' });
      const eventCalls = await checkForEventCalls();
      expect(eventCalls.length).to.equal(1);
      expect(eventCalls[0].name).to.include('method=phone');
    });
    it("Warns if measurement ID doesn't match.", done => {
      const warnStub = stub(console, 'warn').callsFake(() => {
        expect(warnStub.args[0][1]).to.include('does not match');
        done();
      });
      app = initializeApp({
        ...config,
        measurementId: 'wrong-id'
      });
      getAnalytics(app);
    });
  });
  describe('Using initializeAnalytics()', () => {
    it('logEvent() sends correct network request.', async () => {
      app = initializeApp(config);
      logEvent(initializeAnalytics(app), 'login', { method: 'email' });
      const eventCalls = await checkForEventCalls();
      expect(eventCalls.length).to.equal(1);
      expect(eventCalls[0].name).to.include('method=email');
    });
    it('getAnalytics() does not throw if called after initializeAnalytics().', async () => {
      const analyticsInstance = getAnalytics(app);
      expect(analyticsInstance.app).to.equal(app);
    });
    it('initializeAnalytics() throws if called more than once.', async () => {
      expect(() => initializeAnalytics(app)).to.throw(
        AnalyticsError.ALREADY_INITIALIZED
      );
      await deleteApp(app);
    });
  });
});

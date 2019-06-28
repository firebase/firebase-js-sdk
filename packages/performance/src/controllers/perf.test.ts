/**
 * @license
 * Copyright 2019 Google Inc.
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
import { stub } from 'sinon';
import { PerformanceController } from '../controllers/perf';
import { Trace } from '../resources/trace';
import { Api, setupApi } from '../services/api_service';
import { FirebaseApp } from '@firebase/app-types';
import * as initializationService from '../services/initialization_service';
import { consoleLogger } from '../utils/console_logger';
import '../../test/setup';

describe('Firebase Performance Test', () => {
  setupApi(window);

  const fakeFirebaseConfig = {
    apiKey: 'api-key',
    authDomain: 'project-id.firebaseapp.com',
    databaseURL: 'https://project-id.firebaseio.com',
    projectId: 'project-id',
    storageBucket: 'project-id.appspot.com',
    messagingSenderId: 'sender-id',
    appId: '1:111:web:a1234'
  };

  const fakeFirebaseApp = ({
    options: fakeFirebaseConfig
  } as unknown) as FirebaseApp;

  describe('#constructor', () => {
    it('does not initialize performance if the required apis are not available', () => {
      stub(Api.prototype, 'requiredApisAvailable').returns(false);
      stub(initializationService, 'getInitializationPromise');
      stub(consoleLogger, 'info');
      new PerformanceController(fakeFirebaseApp);

      expect(initializationService.getInitializationPromise).not.be.called;
      expect(consoleLogger.info).be.called;
    });
  });

  describe('#trace', () => {
    it('creates a custom trace', () => {
      const controller = new PerformanceController(fakeFirebaseApp);
      const myTrace = controller.trace('myTrace');

      expect(myTrace).to.be.instanceOf(Trace);
    });

    it('custom trace has the correct name', () => {
      const controller = new PerformanceController(fakeFirebaseApp);
      const myTrace = controller.trace('myTrace');

      expect(myTrace.name).is.equal('myTrace');
    });

    it('custom trace is not auto', () => {
      const controller = new PerformanceController(fakeFirebaseApp);
      const myTrace = controller.trace('myTrace');

      expect(myTrace.isAuto).is.equal(false);
    });
  });

  describe('#instrumentationEnabled', () => {
    it('sets instrumentationEnabled to enabled', async () => {
      const controller = new PerformanceController(fakeFirebaseApp);

      controller.instrumentationEnabled = true;
      expect(controller.instrumentationEnabled).is.equal(true);
    });

    it('sets instrumentationEnabled to disabled', async () => {
      const controller = new PerformanceController(fakeFirebaseApp);

      controller.instrumentationEnabled = false;
      expect(controller.instrumentationEnabled).is.equal(false);
    });
  });

  describe('#dataCollectionEnabled', () => {
    it('sets dataCollectionEnabled to enabled', async () => {
      const controller = new PerformanceController(fakeFirebaseApp);

      controller.dataCollectionEnabled = true;
      expect(controller.dataCollectionEnabled).is.equal(true);
    });

    it('sets dataCollectionEnabled to disabled', () => {
      const controller = new PerformanceController(fakeFirebaseApp);

      controller.dataCollectionEnabled = false;
      expect(controller.dataCollectionEnabled).is.equal(false);
    });
  });
});

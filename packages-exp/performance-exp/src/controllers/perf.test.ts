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

import { expect } from 'chai';
import { stub } from 'sinon';
import { PerformanceController } from '../controllers/perf';
import { Api, setupApi } from '../services/api_service';
import * as initializationService from '../services/initialization_service';
import { SettingsService } from '../services/settings_service';
import { consoleLogger } from '../utils/console_logger';
import { FirebaseApp } from '@firebase/app-types-exp';
import { _FirebaseInstallationsInternal } from '@firebase/installations-types-exp';
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

  const fakeInstallations = ({} as unknown) as _FirebaseInstallationsInternal;

  describe('#constructor', () => {
    it('does not initialize performance if the required apis are not available', () => {
      stub(Api.prototype, 'requiredApisAvailable').returns(false);
      stub(initializationService, 'getInitializationPromise');
      stub(consoleLogger, 'info');
      const performanceController = new PerformanceController(
        fakeFirebaseApp,
        fakeInstallations
      );
      performanceController._init();

      expect(initializationService.getInitializationPromise).not.be.called;
      expect(consoleLogger.info).to.be.calledWithMatch(
        /.*Fetch.*Promise.*cookies.*/
      );
    });
  });

  describe('#settings', () => {
    it('applies the settings if provided', async () => {
      const settings = {
        instrumentationEnabled: false,
        dataCollectionEnabled: false
      };

      const performance = new PerformanceController(
        fakeFirebaseApp,
        fakeInstallations
      );
      performance._init(settings);

      expect(performance.instrumentationEnabled).is.equal(false);
      expect(performance.dataCollectionEnabled).is.equal(false);
    });

    it('uses defaults when settings are not provided', async () => {
      const expectedInstrumentationEnabled = SettingsService.getInstance()
        .instrumentationEnabled;
      const expectedDataCollectionEnabled = SettingsService.getInstance()
        .dataCollectionEnabled;

      const performance = new PerformanceController(
        fakeFirebaseApp,
        fakeInstallations
      );
      performance._init();

      expect(performance.instrumentationEnabled).is.equal(
        expectedInstrumentationEnabled
      );
      expect(performance.dataCollectionEnabled).is.equal(
        expectedDataCollectionEnabled
      );
    });

    describe('#instrumentationEnabled', () => {
      it('sets instrumentationEnabled to enabled', async () => {
        const performance = new PerformanceController(
          fakeFirebaseApp,
          fakeInstallations
        );
        performance._init();

        performance.instrumentationEnabled = true;
        expect(performance.instrumentationEnabled).is.equal(true);
      });

      it('sets instrumentationEnabled to disabled', async () => {
        const performance = new PerformanceController(
          fakeFirebaseApp,
          fakeInstallations
        );
        performance._init();

        performance.instrumentationEnabled = false;
        expect(performance.instrumentationEnabled).is.equal(false);
      });
    });

    describe('#dataCollectionEnabled', () => {
      it('sets dataCollectionEnabled to enabled', async () => {
        const performance = new PerformanceController(
          fakeFirebaseApp,
          fakeInstallations
        );
        performance._init();

        performance.dataCollectionEnabled = true;
        expect(performance.dataCollectionEnabled).is.equal(true);
      });

      it('sets dataCollectionEnabled to disabled', () => {
        const performance = new PerformanceController(
          fakeFirebaseApp,
          fakeInstallations
        );
        performance._init();

        performance.dataCollectionEnabled = false;
        expect(performance.dataCollectionEnabled).is.equal(false);
      });
    });
  });
});

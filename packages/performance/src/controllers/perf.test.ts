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

import { PerformanceController } from '../controllers/perf';
import { Api, setupApi } from '../services/api_service';
import * as initializationService from '../services/initialization_service';
import { SettingsService } from '../services/settings_service';
import { consoleLogger } from '../utils/console_logger';
import { FirebaseApp } from '@firebase/app';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import '../../test/setup';
import { vi } from 'vitest';

vi.mock('../services/initialization_service', { spy: true });

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

  const fakeFirebaseApp = {
    options: fakeFirebaseConfig
  } as unknown as FirebaseApp;

  const fakeInstallations = {} as unknown as _FirebaseInstallationsInternal;

  describe('#constructor', () => {
    it('does not initialize performance if the required apis are not available', () => {
      vi.spyOn(Api.prototype, 'requiredApisAvailable').mockReturnValue(false);
      vi.spyOn(consoleLogger, 'info').mockImplementation(() => {});
      const performanceController = new PerformanceController(
        fakeFirebaseApp,
        fakeInstallations
      );
      performanceController._init();

      expect(
        initializationService.getInitializationPromise
      ).not.toHaveBeenCalled();
      expect(consoleLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/.*Fetch.*Promise.*cookies.*/)
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

      expect(performance.instrumentationEnabled).toBe(false);
      expect(performance.dataCollectionEnabled).toBe(false);
    });

    it('uses defaults when settings are not provided', async () => {
      const expectedInstrumentationEnabled =
        SettingsService.getInstance().instrumentationEnabled;
      const expectedDataCollectionEnabled =
        SettingsService.getInstance().dataCollectionEnabled;

      const performance = new PerformanceController(
        fakeFirebaseApp,
        fakeInstallations
      );
      performance._init();

      expect(performance.instrumentationEnabled).toBe(
        expectedInstrumentationEnabled
      );
      expect(performance.dataCollectionEnabled).toBe(
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
        expect(performance.instrumentationEnabled).toBe(true);
      });

      it('sets instrumentationEnabled to disabled', async () => {
        const performance = new PerformanceController(
          fakeFirebaseApp,
          fakeInstallations
        );
        performance._init();

        performance.instrumentationEnabled = false;
        expect(performance.instrumentationEnabled).toBe(false);
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
        expect(performance.dataCollectionEnabled).toBe(true);
      });

      it('sets dataCollectionEnabled to disabled', () => {
        const performance = new PerformanceController(
          fakeFirebaseApp,
          fakeInstallations
        );
        performance._init();

        performance.dataCollectionEnabled = false;
        expect(performance.dataCollectionEnabled).toBe(false);
      });
    });
  });
});

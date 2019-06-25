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
import { Trace } from '../resources/trace';
import { setupOobResources } from '../services/oob_resources_service';
import { SettingsService } from '../services/settings_service';
import { getInitializationPromise } from '../services/initialization_service';
import { Api } from '../services/api_service';
import { FirebaseApp } from '@firebase/app-types';
import { FirebasePerformance } from '@firebase/performance-types';
import { consoleLogger } from '../utils/console_logger';

export class PerformanceController implements FirebasePerformance {
  constructor(readonly app: FirebaseApp) {
    if (Api.getInstance().requiredApisAvailable()) {
      getInitializationPromise().then(setupOobResources, setupOobResources);
    } else {
      consoleLogger.info(
        'Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled.'
      );
    }
  }

  trace(name: string): Trace {
    return new Trace(name);
  }

  set instrumentationEnabled(val: boolean) {
    SettingsService.getInstance().instrumentationEnabled = val;
  }
  get instrumentationEnabled(): boolean {
    return SettingsService.getInstance().instrumentationEnabled;
  }

  set dataCollectionEnabled(val: boolean) {
    SettingsService.getInstance().dataCollectionEnabled = val;
  }
  get dataCollectionEnabled(): boolean {
    return SettingsService.getInstance().dataCollectionEnabled;
  }
}

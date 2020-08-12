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
import { FirebaseApp } from '@firebase/app-types-exp';
import {
  PerformanceSettings,
  FirebasePerformanceInternal
} from '@firebase/performance-types-exp';

import { Api } from '../services/api_service';
import { getInitializationPromise } from '../services/initialization_service';
import { setupOobResources } from '../services/oob_resources_service';
import { SettingsService } from '../services/settings_service';
import { setupTransportService } from '../services/transport_service';
import { consoleLogger } from '../utils/console_logger';
import { FirebaseInstallations } from '@firebase/installations-types';

export class PerformanceController implements FirebasePerformanceInternal {
  constructor(
    readonly app: FirebaseApp,
    readonly installations: FirebaseInstallations
  ) {}

  /**
   * This method *must* be called internally as part of creating a
   * PerformanceController instance.
   *
   * Currently it's not possible to pass the settings object through the
   * constructor using Components, so this method exists to be called with the
   * desired settings, to ensure nothing is collected without the user's
   * consent.
   */
  _init(settings?: PerformanceSettings): void {
    if (settings?.dataCollectionEnabled !== undefined) {
      this.dataCollectionEnabled = settings.dataCollectionEnabled;
    }
    if (settings?.instrumentationEnabled !== undefined) {
      this.instrumentationEnabled = settings.instrumentationEnabled;
    }

    if (Api.getInstance().requiredApisAvailable()) {
      setupTransportService();
      getInitializationPromise(this).then(
        () => setupOobResources(this),
        () => setupOobResources(this)
      );
    } else {
      consoleLogger.info(
        'Firebase Performance cannot start if the browser does not support ' +
          '"Fetch" and "Promise", or cookies are disabled.'
      );
    }
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

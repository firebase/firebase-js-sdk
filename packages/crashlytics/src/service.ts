/**
 * @license
 * Copyright 2025 Google LLC
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

import { _FirebaseService, FirebaseApp } from '@firebase/app';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import { LoggerProvider, Logger } from '@opentelemetry/api-logs';
import { AttributesStore } from './attributes-store';

export class CrashlyticsService implements Crashlytics, _FirebaseService {
  private _options?: CrashlyticsOptions;
  logger: Logger;

  constructor(
    public app: FirebaseApp,
    public loggerProvider: LoggerProvider,
    public attributesStore: AttributesStore,
    customLogger?: Logger
  ) {
    this.logger =
      customLogger || loggerProvider.getLogger('@firebase/crashlytics');
  }

  _delete(): Promise<void> {
    return Promise.resolve();
  }

  set options(optionsToSet: CrashlyticsOptions) {
    this._options = optionsToSet;
    this.attributesStore.updateOptions(optionsToSet);
  }

  get options(): CrashlyticsOptions | undefined {
    return this._options;
  }
}

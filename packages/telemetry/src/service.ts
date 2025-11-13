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
import { Telemetry } from './public-types';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { _FirebaseInstallationsInternal } from '@firebase/installations';

export class TelemetryService implements Telemetry, _FirebaseService {
  fid?: string;

  constructor(public app: FirebaseApp, public installationsProvider: _FirebaseInstallationsInternal, public loggerProvider: LoggerProvider) {
    void this._getFid();
  }

  private async _getFid(): Promise<void> {
    try {
      const fid = await this.installationsProvider.getId();
      this.fid = fid;
    } catch (err) {
      console.error('Failed to get FID for telemetry:', err);
    }
  }

  _delete(): Promise<void> {
    return Promise.resolve();
  }
}

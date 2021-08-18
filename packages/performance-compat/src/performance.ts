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

import {
  trace,
  FirebasePerformance,
  // The PerformanceTrace type has not changed between modular and non-modular packages.
  PerformanceTrace
} from '@firebase/performance-exp';
import { FirebasePerformance as FirebasePerformanceCompat } from '@firebase/performance-types';
import { FirebaseApp, _FirebaseService } from '@firebase/app-compat';

export class PerformanceCompatImpl
  implements FirebasePerformanceCompat, _FirebaseService {
  constructor(
    public app: FirebaseApp,
    readonly _delegate: FirebasePerformance
  ) {}

  get instrumentationEnabled(): boolean {
    return this._delegate.instrumentationEnabled;
  }

  set instrumentationEnabled(val: boolean) {
    this._delegate.instrumentationEnabled = val;
  }

  get dataCollectionEnabled(): boolean {
    return this._delegate.dataCollectionEnabled;
  }

  set dataCollectionEnabled(val: boolean) {
    this._delegate.dataCollectionEnabled = val;
  }

  trace(traceName: string): PerformanceTrace {
    return trace(this._delegate, traceName);
  }
}

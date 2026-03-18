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

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { Crashlytics } from '../../public-types';
import { CrashlyticsInternal } from '../../types';

/**
 * Register Fetch instrumentation for the given Crashlytics instance.
 *
 * @public
 */
export function registerFetchInstrumentation(crashlytics: Crashlytics): void {
  const tracingProvider = (crashlytics as CrashlyticsInternal).tracingProvider;
  if (tracingProvider) {
    registerInstrumentations({
      tracerProvider: tracingProvider,
      instrumentations: [new FetchInstrumentation()]
    });
  }
}

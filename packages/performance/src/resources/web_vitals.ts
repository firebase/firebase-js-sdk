/**
 * @license
 * Copyright 2024 Google LLC
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

<<<<<<<< HEAD:e2e/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: './fix-jsdom-environment.ts',
  globals: {
    FIREBASE_APPCHECK_DEBUG_TOKEN: process.env.APP_CHECK_DEBUG_TOKEN
  }
};

export default config;
========
export interface CoreVitalMetric {
  value: number;
  elementAttribution?: string;
}

export interface WebVitalMetrics {
  cls?: CoreVitalMetric;
  inp?: CoreVitalMetric;
  lcp?: CoreVitalMetric;
}
>>>>>>>> 86155b3c8f3974f8d777232625108c14f924e035:packages/performance/src/resources/web_vitals.ts

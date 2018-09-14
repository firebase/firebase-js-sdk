/**
 * Copyright 2017 Google Inc.
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

export interface FirebasePerformance {
  trace(traceName: string): PerformanceTrace;

  instrumentationEnabled: boolean;
  dataCollectionEnabled: boolean;
}

export interface PerformanceTrace {
  start(): void;
  stop(): void;
  record(
    startTime: number,
    duration: number,
    options?: {
      metrics?: { [key: string]: number };
      attributes?: { [key: string]: string };
    }
  ): void;
  incrementMetric(metricName: string, num: number): void;
  putMetric(counter: string, num: number): void;
  getMetric(counter: string): void;
  putAttribute(attr: string, value: string): void;
  getAttribute(attr: string): string | undefined;
  removeAttribute(attr: string): void;
  getAttributes(): { [key: string]: string };
}

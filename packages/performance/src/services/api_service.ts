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

import { ERROR_FACTORY, ErrorCode } from '../utils/errors';

declare global {
  interface Window {
    PerformanceObserver: typeof PerformanceObserver;
    perfMetrics?: { onFirstInputDelay: Function };
  }
}

let apiInstance: Api | undefined;
let windowInstance: Window | undefined;

export type EntryType =
  | 'mark'
  | 'measure'
  | 'paint'
  | 'resource'
  | 'frame'
  | 'navigation';

/**
 * This class holds a reference to various browser related objects injected by set methods.
 */
export class Api {
  private performance: Performance;
  /** PreformanceObserver constructor function. */
  private PerformanceObserver: typeof PerformanceObserver;
  private windowLocation: Location;
  onFirstInputDelay?: Function;
  localStorage!: Storage;
  document: Document;
  navigator: Navigator;

  constructor(window?: Window) {
    if (!window) {
      throw ERROR_FACTORY.create(ErrorCode.NO_WINDOW);
    }
    this.performance = window.performance;
    this.PerformanceObserver = window.PerformanceObserver;
    this.windowLocation = window.location;
    this.navigator = window.navigator;
    this.document = window.document;
    if (this.navigator && this.navigator.cookieEnabled) {
      // If user blocks cookies on the browser, accessing localStorage will throw an exception.
      this.localStorage = window.localStorage;
    }
    if (window.perfMetrics && window.perfMetrics.onFirstInputDelay) {
      this.onFirstInputDelay = window.perfMetrics.onFirstInputDelay;
    }
  }

  getUrl(): string {
    // Do not capture the string query part of url.
    return this.windowLocation.href.split('?')[0];
  }

  mark(name: string): void {
    if (!this.performance || !this.performance.mark) {
      return;
    }
    this.performance.mark(name);
  }

  measure(measureName: string, mark1: string, mark2: string): void {
    if (!this.performance || !this.performance.measure) {
      return;
    }
    this.performance.measure(measureName, mark1, mark2);
  }

  getEntriesByType(type: EntryType): PerformanceEntry[] {
    if (!this.performance || !this.performance.getEntriesByType) {
      return [];
    }
    return this.performance.getEntriesByType(type);
  }

  getEntriesByName(name: string): PerformanceEntry[] {
    if (!this.performance || !this.performance.getEntriesByName) {
      return [];
    }
    return this.performance.getEntriesByName(name);
  }

  getTimeOrigin(): number {
    // Polyfill the time origin with performance.timing.navigationStart.
    return (
      this.performance &&
      (this.performance.timeOrigin || this.performance.timing.navigationStart)
    );
  }

  requiredApisAvailable(): boolean {
    if (fetch && Promise && this.navigator && this.navigator.cookieEnabled) {
      return true;
    }
    return false;
  }

  setupObserver(
    entryType: EntryType,
    callback: (entry: PerformanceEntry) => void
  ): void {
    if (!this.PerformanceObserver) {
      return;
    }
    const observer = new this.PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        // `entry` is a PerformanceEntry instance.
        callback(entry);
      }
    });

    // Start observing the entry types you care about.
    observer.observe({ entryTypes: [entryType] });
  }

  static getInstance(): Api {
    if (apiInstance === undefined) {
      apiInstance = new Api(windowInstance);
    }
    return apiInstance;
  }
}

export function setupApi(window: Window): void {
  windowInstance = window;
}

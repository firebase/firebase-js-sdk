/**
 * @license
 * Copyright 2026 Google LLC
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

import { Api, setupApi } from './api_service';
import '../../test/setup';
import { vi } from 'vitest';

describe('Firebase Performance > api_service', () => {
  const PAGE_URL = 'http://www.test.com/abcd?a=2';
  const PERFORMANCE_ENTRY: PerformanceEntry = {
    duration: 0,
    entryType: 'paint',
    name: 'first-contentful-paint',
    startTime: 149.01000005193055,
    toJSON: () => {}
  };

  const mockWindow = { ...self };
  // hack for IE11. self.hasOwnProperty('performance') returns false in IE11
  mockWindow.performance = self.performance;

  let api: Api;

  beforeEach(() => {
    vi.spyOn(mockWindow.performance, 'mark').mockImplementation(
      () => undefined as any
    );
    vi.spyOn(mockWindow.performance, 'measure').mockImplementation(
      () => undefined as any
    );
    vi.spyOn(mockWindow.performance, 'getEntriesByType').mockReturnValue([
      PERFORMANCE_ENTRY
    ]);
    vi.spyOn(mockWindow.performance, 'getEntriesByName').mockReturnValue([
      PERFORMANCE_ENTRY
    ]);
    // This is to make sure the test page is not changed by changing the href of location object.
    mockWindow.location = { ...self.location, href: PAGE_URL };

    setupApi(mockWindow);
    api = Api.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('getUrl', () => {
    it('removes the query params', () => {
      expect(api.getUrl()).toBe('http://www.test.com/abcd');
    });
  });

  describe('mark', () => {
    it('creates performance mark', () => {
      const MARK_NAME = 'mark1';
      api.mark(MARK_NAME);

      expect(mockWindow.performance.mark).toHaveBeenCalledTimes(1);
      expect(mockWindow.performance.mark).toHaveBeenCalledWith(MARK_NAME);
    });
  });

  describe('measure', () => {
    it('creates a performance measure', () => {
      const MEASURE_NAME = 'measure1';
      const MARK_1_NAME = 'mark1';
      const MARK_2_NAME = 'mark2';
      api.measure(MEASURE_NAME, MARK_1_NAME, MARK_2_NAME);

      expect(mockWindow.performance.measure).toHaveBeenCalledTimes(1);
      expect(mockWindow.performance.measure).toHaveBeenCalledWith(
        MEASURE_NAME,
        MARK_1_NAME,
        MARK_2_NAME
      );
    });
  });

  describe('getEntriesByType', () => {
    it('calls the underlying performance api', () => {
      expect(api.getEntriesByType('paint')).toEqual([PERFORMANCE_ENTRY]);
    });

    it('does not throw if the browser does not include underlying api', () => {
      api = new Api({ performance: undefined } as unknown as Window);

      expect(() => {
        api.getEntriesByType('paint');
      }).not.toThrow();
      expect(api.getEntriesByType('paint')).toEqual([]);
    });
  });

  describe('getEntriesByName', () => {
    it('calls the underlying performance api', () => {
      expect(api.getEntriesByName('paint')).toEqual([PERFORMANCE_ENTRY]);
    });

    it('does not throw if the browser does not include underlying api', () => {
      api = new Api({ performance: undefined } as any as Window);

      expect(() => {
        api.getEntriesByName('paint');
      }).not.toThrow();
      expect(api.getEntriesByName('paint')).toEqual([]);
    });
  });
});

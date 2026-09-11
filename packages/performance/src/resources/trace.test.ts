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

import { Trace } from '../resources/trace';
import { Api, setupApi } from '../services/api_service';
import * as perfLogger from '../services/perf_logger';
import { PerformanceController } from '../controllers/perf';
import { FirebaseApp } from '@firebase/app';
import { FirebaseInstallations } from '@firebase/installations-types';

import '../../test/setup';
import { vi } from 'vitest';

import { consoleLogger } from '../utils/console_logger';

vi.mock('../services/perf_logger', { spy: true });

describe('Firebase Performance > trace', () => {
  setupApi(window);
  const fakeFirebaseConfig = {
    apiKey: 'api-key',
    authDomain: 'project-id.firebaseapp.com',
    databaseURL: 'https://project-id.firebaseio.com',
    projectId: 'project-id',
    storageBucket: 'project-id.appspot.com',
    messagingSenderId: 'sender-id',
    appId: '1:111:web:a1234'
  };

  const fakeFirebaseApp = {
    options: fakeFirebaseConfig
  } as unknown as FirebaseApp;

  const fakeInstallations = {} as unknown as FirebaseInstallations;
  const performanceController = new PerformanceController(
    fakeFirebaseApp,
    fakeInstallations
  );

  let trace: Trace;
  const createTrace = (): Trace => {
    return new Trace(performanceController, 'test');
  };

  beforeEach(() => {
    vi.spyOn(Api.prototype, 'mark');
    vi.spyOn(consoleLogger, 'info').mockImplementation(() => {});
    trace = createTrace();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('#start', () => {
    beforeEach(() => {
      trace.start();
    });

    it('uses the underlying api method', () => {
      expect(Api.getInstance().mark).toHaveBeenCalledTimes(1);
    });

    it('throws if a trace is started twice', () => {
      expect(() => trace.start()).toThrow();
    });
  });

  describe('#stop', () => {
    it('adds a mark to the performance timeline', () => {
      trace.start();
      trace.stop();

      expect(Api.getInstance().mark).toHaveBeenCalledTimes(2);
    });

    it('logs the trace', () => {
      trace.start();
      trace.stop();

      expect(perfLogger.logTrace).toHaveBeenCalledTimes(1);
      expect(perfLogger.logTrace).toHaveBeenCalledWith(trace);
    });
  });

  describe('#record', () => {
    it('logs a custom trace with non-positive start time value', () => {
      expect(() => trace.record(0, 20)).toThrow();
      expect(() => trace.record(-100, 20)).toThrow();
    });

    it('logs a custom trace with non-positive duration value', () => {
      expect(() => trace.record(1000, 0)).toThrow();
      expect(() => trace.record(1000, -200)).toThrow();
    });

    it('logs a trace without metrics or custom attributes', () => {
      trace.record(1, 20);

      expect(perfLogger.logTrace).toHaveBeenCalledTimes(1);
      expect(perfLogger.logTrace).toHaveBeenCalledWith(trace);
    });

    it('logs a trace with metrics', () => {
      trace.record(1, 20, { metrics: { cacheHits: 1 } });

      expect(perfLogger.logTrace).toHaveBeenCalledTimes(1);
      expect(perfLogger.logTrace).toHaveBeenCalledWith(trace);
      expect(trace.getMetric('cacheHits')).toEqual(1);
    });

    it('logs a trace with custom attributes', () => {
      trace.record(1, 20, { attributes: { level: '1' } });

      expect(perfLogger.logTrace).toHaveBeenCalledTimes(1);
      expect(perfLogger.logTrace).toHaveBeenCalledWith(trace);
      expect(trace.getAttributes()).toEqual({ level: '1' });
    });

    it('logs a trace with custom attributes and metrics', () => {
      trace.record(1, 20, {
        attributes: { level: '1' },
        metrics: { cacheHits: 1 }
      });

      expect(perfLogger.logTrace).toHaveBeenCalledTimes(1);
      expect(perfLogger.logTrace).toHaveBeenCalledWith(trace);
      expect(trace.getAttributes()).toEqual({ level: '1' });
      expect(trace.getMetric('cacheHits')).toEqual(1);
    });

    it('does not log counter with invalid counter value', () => {
      trace.record(1, 20, {
        metrics: { level: NaN }
      });

      expect(perfLogger.logTrace).toHaveBeenCalledTimes(1);
      expect(perfLogger.logTrace).toHaveBeenCalledWith(trace);
      expect(trace.getMetric('level')).toEqual(0);
    });
  });

  describe('#incrementMetric', () => {
    it('creates new metric if one doesnt exist.', () => {
      trace.incrementMetric('cacheHits', 200);

      expect(trace.getMetric('cacheHits')).toEqual(200);
    });

    it('increments metric if it already exists.', () => {
      trace.incrementMetric('cacheHits', 200);
      trace.incrementMetric('cacheHits', 400);

      expect(trace.getMetric('cacheHits')).toEqual(600);
    });

    it('increments metric value as an integer even if the value is provided in float.', () => {
      trace.incrementMetric('cacheHits', 200);
      trace.incrementMetric('cacheHits', 400.38);

      expect(trace.getMetric('cacheHits')).toEqual(600);
    });

    it('increments metric value with a negative float.', () => {
      trace.incrementMetric('cacheHits', 200);
      trace.incrementMetric('cacheHits', -230.38);

      expect(trace.getMetric('cacheHits')).toEqual(-31);
    });

    it('throws error if metric doesnt exist and has invalid name', () => {
      expect(() => trace.incrementMetric('_invalidMetric', 1)).toThrow();
    });
  });

  describe('#putMetric', () => {
    it('creates new metric if one doesnt exist and has valid name.', () => {
      trace.putMetric('cacheHits', 200);

      expect(trace.getMetric('cacheHits')).toEqual(200);
    });

    it('sets the metric value as an integer even if the value is provided in float.', () => {
      trace.putMetric('timelapse', 200.48);

      expect(trace.getMetric('timelapse')).toEqual(200);
    });

    it('replaces metric if it already exists.', () => {
      trace.putMetric('cacheHits', 200);
      trace.putMetric('cacheHits', 400);

      expect(trace.getMetric('cacheHits')).toEqual(400);
    });

    it('replaces undefined metrics with 0', () => {
      // @ts-ignore A non-TS user could provide undefined.
      trace.putMetric('cacheHits', undefined);

      expect(trace.getMetric('cacheHits')).toEqual(0);
    });

    it('throws error if metric doesnt exist and has invalid name', () => {
      expect(() => trace.putMetric('_invalidMetric', 1)).toThrow();
      expect(() => trace.putMetric('_fid', 1)).toThrow();
    });
  });

  describe('#getMetric', () => {
    it('returns 0 if metric doesnt exist', () => {
      expect(trace.getMetric('doesThisExist')).toBe(0);
    });

    it('returns 0 if it exists and equals 0', () => {
      trace.putMetric('cacheHits', 0);

      expect(trace.getMetric('cacheHits')).toBe(0);
    });

    it('returns metric if it exists', () => {
      trace.putMetric('cacheHits', 200);

      expect(trace.getMetric('cacheHits')).toBe(200);
    });

    it('returns multiple metrics if they exist', () => {
      trace.putMetric('cacheHits', 200);
      trace.putMetric('bytesDownloaded', 25);

      expect(trace.getMetric('cacheHits')).toBe(200);
      expect(trace.getMetric('bytesDownloaded')).toBe(25);
    });
  });

  describe('#putAttribute', () => {
    it('creates new attribute if it doesnt exist', () => {
      trace.putAttribute('level', '4');

      expect(trace.getAttributes()).toEqual({ level: '4' });
    });

    it('replaces attribute if it exists', () => {
      trace.putAttribute('level', '4');
      trace.putAttribute('level', '7');

      expect(trace.getAttributes()).toEqual({ level: '7' });
    });

    it('throws error if attribute name is invalid', () => {
      expect(() => trace.putAttribute('_invalidAttribute', '1')).toThrow();
    });

    it('throws error if attribute value is invalid', () => {
      const longAttributeValue =
        'too-long-attribute-value-over-one-hundred-characters-too-long-attribute-value-over-one-' +
        'hundred-charac';
      expect(() =>
        trace.putAttribute('validName', longAttributeValue)
      ).toThrow();
    });
  });

  describe('#getAttribute', () => {
    it('returns undefined for attribute that doesnt exist', () => {
      expect(trace.getAttribute('level')).toBeUndefined();
    });

    it('returns attribute if it exists', () => {
      trace.putAttribute('level', '4');
      expect(trace.getAttribute('level')).toBe('4');
    });

    it('returns separate attributes if they exist', () => {
      trace.putAttribute('level', '4');
      trace.putAttribute('stage', 'beginning');

      expect(trace.getAttribute('level')).toBe('4');
      expect(trace.getAttribute('stage')).toBe('beginning');
    });
  });

  describe('#removeAttribute', () => {
    it('does not throw if removing attribute that doesnt exist', () => {
      expect(() => trace.removeAttribute('doesNotExist')).to.not.throw;
    });

    it('removes attribute if it exists', () => {
      trace.putAttribute('level', '4');
      expect(trace.getAttribute('level')).toBe('4');

      trace.removeAttribute('level');
      expect(trace.getAttribute('level')).toBeUndefined();
    });

    it('retains other attributes', () => {
      trace.putAttribute('level', '4');
      trace.putAttribute('stage', 'beginning');

      trace.removeAttribute('level');
      expect(trace.getAttribute('level')).toBeUndefined();
      expect(trace.getAttribute('stage')).toBe('beginning');
    });
  });

  describe('#addWebVitalMetric', () => {
    it('has correctly scaled metric', () => {
      Trace.addWebVitalMetric(trace, 'metric', 'attributeName', {
        value: 0.5,
        elementAttribution: 'test'
      });

      expect(trace.getMetric('metric') === 500);
    });

    it('has correct attribute', () => {
      Trace.addWebVitalMetric(trace, 'metric', 'attributeName', {
        value: 0.5,
        elementAttribution: 'test'
      });

      expect(trace.getAttribute('attributeName') === 'test');
    });

    it('correctly truncates long attribute names', () => {
      Trace.addWebVitalMetric(trace, 'metric', 'attributeName', {
        value: 0.5,
        elementAttribution:
          'html>body>main>p>button.my_button_class.really_long_class_name_that_is_above_100_characters.another_long_class_name'
      });

      expect(
        trace.getAttribute('attributeName') ===
          'html>body>main>p>button.my_button_class.really_long_class_name_that_is_above_100_characters.another_'
      );
    });
  });
});

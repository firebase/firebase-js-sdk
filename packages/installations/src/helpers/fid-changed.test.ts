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

import { expect, vi, describe, it, beforeEach } from 'vitest';
import '../testing/setup';
import { AppConfig } from '../interfaces/installation-impl';
import {
  fidChanged,
  addCallback,
  removeCallback
} from '../helpers/fid-changed';
import { getFakeAppConfig } from '../testing/fake-generators';

const FID = 'evil-lies-in-every-man';

describe('onIdChange', () => {
  describe('with single app', () => {
    let appConfig: AppConfig;

    beforeEach(() => {
      appConfig = getFakeAppConfig();
    });

    it('calls the provided callback when FID changes', () => {
      const stubFn = vi.fn();
      addCallback(appConfig, stubFn);

      fidChanged(appConfig, FID);

      expect(stubFn).toHaveBeenCalledTimes(1);
      expect(stubFn).toHaveBeenCalledWith(FID);
    });

    it('calls multiple callbacks', () => {
      const stubA = vi.fn();
      addCallback(appConfig, stubA);
      const stubB = vi.fn();
      addCallback(appConfig, stubB);

      fidChanged(appConfig, FID);

      expect(stubA).toHaveBeenCalledTimes(1);
      expect(stubA).toHaveBeenCalledWith(FID);
      expect(stubB).toHaveBeenCalledTimes(1);
      expect(stubB).toHaveBeenCalledWith(FID);
    });

    it('does not call removed callbacks', () => {
      const stubFn = vi.fn();
      addCallback(appConfig, stubFn);

      removeCallback(appConfig, stubFn);
      fidChanged(appConfig, FID);

      expect(stubFn).not.toHaveBeenCalled();
    });

    it('does not throw when removeCallback is called multiple times', () => {
      const stubFn = vi.fn();
      addCallback(appConfig, stubFn);

      removeCallback(appConfig, stubFn);
      removeCallback(appConfig, stubFn);
      fidChanged(appConfig, FID);

      expect(stubFn).not.toHaveBeenCalled();
    });
  });

  describe('with multiple apps', () => {
    let appConfigA: AppConfig;
    let appConfigB: AppConfig;

    beforeEach(() => {
      appConfigA = getFakeAppConfig();
      appConfigB = getFakeAppConfig({ appName: 'differentAppName' });
    });

    it('calls the correct callback when FID changes', () => {
      const stubA = vi.fn();
      addCallback(appConfigA, stubA);
      const stubB = vi.fn();
      addCallback(appConfigB, stubB);

      fidChanged(appConfigA, FID);

      expect(stubA).toHaveBeenCalledTimes(1);
      expect(stubA).toHaveBeenCalledWith(FID);
      expect(stubB).not.toHaveBeenCalled();
    });
  });
});

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
  getFakeApp,
  getFakeModularPerformance,
  getFakeModularPerformanceTrace
} from '../test/util';
import * as perfModularApi from '@firebase/performance';
import { PerformanceCompatImpl } from './performance';

vi.mock('@firebase/performance', { spy: true });

describe('Performance Compat', () => {
  let performanceCompat!: PerformanceCompatImpl;
  let fakeModularPerformance!: perfModularApi.FirebasePerformance;

  beforeEach(() => {
    fakeModularPerformance = getFakeModularPerformance();
    performanceCompat = new PerformanceCompatImpl(
      getFakeApp(),
      fakeModularPerformance
    );
  });

  it('sets instrumentation flag on the modular package', () => {
    // Default value of the flag is true.
    performanceCompat.instrumentationEnabled = false;

    expect(fakeModularPerformance.instrumentationEnabled).toBe(false);
  });

  it('sets data collection flag on the modular package', () => {
    // Default value of the flag is true.
    performanceCompat.dataCollectionEnabled = false;

    expect(fakeModularPerformance.dataCollectionEnabled).toBe(false);
  });

  it('calls modular trace api when trace is called on compat api', () => {
    const modularTraceSpy = vi
      .spyOn(perfModularApi, 'trace')
      .mockReturnValue(getFakeModularPerformanceTrace());
    performanceCompat.trace('test');

    expect(modularTraceSpy).toHaveBeenCalledWith(
      fakeModularPerformance,
      'test'
    );
  });
});

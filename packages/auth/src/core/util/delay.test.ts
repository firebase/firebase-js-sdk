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

import * as util from '@firebase/util';
import { Delay, DelayMin } from './delay';
import * as navigator from './navigator';

vi.mock('@firebase/util', { spy: true });
vi.mock('./navigator', { spy: true });

describe('core/util/delay', () => {
  const SHORT_DELAY = 30_000;
  const LONG_DELAY = 60_000;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the short delay in browser environments', () => {
    const delay = new Delay(SHORT_DELAY, LONG_DELAY);
    expect(delay.get()).toBe(SHORT_DELAY);
  });

  it('should return the long delay in Cordova environments', () => {
    vi.spyOn(util, 'isMobileCordova').mockReturnValue(true);
    const delay = new Delay(SHORT_DELAY, LONG_DELAY);
    expect(delay.get()).toBe(LONG_DELAY);
  });

  it('should return the long delay in React Native environments', () => {
    vi.spyOn(util, 'isReactNative').mockReturnValue(true);
    const delay = new Delay(SHORT_DELAY, LONG_DELAY);
    expect(delay.get()).toBe(LONG_DELAY);
  });

  it('should return quicker when offline', () => {
    vi.spyOn(navigator, '_isOnline').mockReturnValue(false);
    const delay = new Delay(SHORT_DELAY, LONG_DELAY);
    expect(delay.get()).toBe(DelayMin.OFFLINE);
  });
});

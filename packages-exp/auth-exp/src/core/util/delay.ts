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

import { isMobileCordova, isReactNative } from '@firebase/util';
import { _isOnline } from './navigator';
import { debugAssert } from './assert';

export const enum DelayMin {
  OFFLINE = 5000
}

/**
 * A structure to help pick between a range of long and short delay durations
 * depending on the current environment. In general, the long delay is used for
 * mobile environments whereas short delays are used for desktop environments.
 */
export class Delay {
  // The default value for the offline delay timeout in ms.

  private readonly isMobile: boolean;
  constructor(
    private readonly shortDelay: number,
    private readonly longDelay: number
  ) {
    // Internal error when improperly initialized.
    debugAssert(
      longDelay > shortDelay,
      'Short delay should be less than long delay!'
    );
    this.isMobile = isMobileCordova() || isReactNative();
  }

  get(): number {
    if (!_isOnline()) {
      // Pick the shorter timeout.
      return Math.min(DelayMin.OFFLINE, this.shortDelay);
    }
    // If running in a mobile environment, return the long delay, otherwise
    // return the short delay.
    // This could be improved in the future to dynamically change based on other
    // variables instead of just reading the current environment.
    return this.isMobile ? this.longDelay : this.shortDelay;
  }
}

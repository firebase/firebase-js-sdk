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

import { clone, forEach } from '@firebase/util';
import { StatsCollection } from './StatsCollection';

/**
 * Returns the delta from the previous call to get stats.
 *
 * @param collection_ The collection to "listen" to.
 * @constructor
 */
export class StatsListener {
  private last_: { [k: string]: number } | null = null;

  constructor(private collection_: StatsCollection) {}

  get(): { [k: string]: number } {
    const newStats = this.collection_.get();

    const delta: typeof newStats = clone(newStats);
    if (this.last_) {
      forEach(this.last_, (stat: string, value: number) => {
        delta[stat] = delta[stat] - value;
      });
    }
    this.last_ = newStats;

    return delta;
  }
}

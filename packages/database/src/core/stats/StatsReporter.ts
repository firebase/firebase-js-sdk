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

import { contains, forEach } from '@firebase/util';
import { setTimeoutNonBlocking } from '../util/util';
import { StatsListener } from './StatsListener';
import { StatsCollection } from './StatsCollection';
import { ServerActions } from '../ServerActions';

// Assuming some apps may have a short amount of time on page, and a bulk of firebase operations probably
// happen on page load, we try to report our first set of stats pretty quickly, but we wait at least 10
// seconds to try to ensure the Firebase connection is established / settled.
const FIRST_STATS_MIN_TIME = 10 * 1000;
const FIRST_STATS_MAX_TIME = 30 * 1000;

// We'll continue to report stats on average every 5 minutes.
const REPORT_STATS_INTERVAL = 5 * 60 * 1000;

/**
 * @constructor
 */
export class StatsReporter {
  private statsListener_: StatsListener;
  private statsToReport_: { [k: string]: boolean } = {};

  /**
   * @param collection
   * @param server_
   */
  constructor(collection: StatsCollection, private server_: ServerActions) {
    this.statsListener_ = new StatsListener(collection);

    const timeout =
      FIRST_STATS_MIN_TIME +
      (FIRST_STATS_MAX_TIME - FIRST_STATS_MIN_TIME) * Math.random();
    setTimeoutNonBlocking(this.reportStats_.bind(this), Math.floor(timeout));
  }

  includeStat(stat: string) {
    this.statsToReport_[stat] = true;
  }

  private reportStats_() {
    const stats = this.statsListener_.get();
    const reportedStats: typeof stats = {};
    let haveStatsToReport = false;

    forEach(stats, (stat: string, value: number) => {
      if (value > 0 && contains(this.statsToReport_, stat)) {
        reportedStats[stat] = value;
        haveStatsToReport = true;
      }
    });

    if (haveStatsToReport) {
      this.server_.reportStats(reportedStats);
    }

    // queue our next run.
    setTimeoutNonBlocking(
      this.reportStats_.bind(this),
      Math.floor(Math.random() * 2 * REPORT_STATS_INTERVAL)
    );
  }
}

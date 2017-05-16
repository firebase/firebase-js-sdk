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
goog.provide('fb.core.stats.StatsReporter');
goog.require('fb.core.util');

// Assuming some apps may have a short amount of time on page, and a bulk of firebase operations probably
// happen on page load, we try to report our first set of stats pretty quickly, but we wait at least 10
// seconds to try to ensure the Firebase connection is established / settled.
var FIRST_STATS_MIN_TIME = 10 * 1000;
var FIRST_STATS_MAX_TIME = 30 * 1000;

// We'll continue to report stats on average every 5 minutes.
var REPORT_STATS_INTERVAL = 5 * 60 * 1000;

/**
 *
 * @param collection
 * @param connection
 * @constructor
 */
fb.core.stats.StatsReporter = function(collection, connection) {
  this.statsToReport_ = {};
  this.statsListener_ = new fb.core.stats.StatsListener(collection);
  this.server_ = connection;

  var timeout = FIRST_STATS_MIN_TIME + (FIRST_STATS_MAX_TIME - FIRST_STATS_MIN_TIME) * Math.random();
  fb.core.util.setTimeoutNonBlocking(goog.bind(this.reportStats_, this), Math.floor(timeout));
};

fb.core.stats.StatsReporter.prototype.includeStat = function(stat) {
  this.statsToReport_[stat] = true;
};

fb.core.stats.StatsReporter.prototype.reportStats_ = function() {
  var stats = this.statsListener_.get();
  var reportedStats = { };
  var haveStatsToReport = false;
  for (var stat in stats) {
    if (stats[stat] > 0 && fb.util.obj.contains(this.statsToReport_, stat)) {
      reportedStats[stat] = stats[stat];
      haveStatsToReport = true;
    }
  }

  if (haveStatsToReport) {
    this.server_.reportStats(reportedStats);
  }

  // queue our next run.
  fb.core.util.setTimeoutNonBlocking(goog.bind(this.reportStats_, this), Math.floor(Math.random() * 2 * REPORT_STATS_INTERVAL));
};

import { contains } from "../../../utils/obj";
import { setTimeoutNonBlocking } from "../util/util";
import { StatsListener } from "./StatsListener";

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
export const StatsReporter = function(collection, connection) {
  this.statsToReport_ = {};
  this.statsListener_ = new StatsListener(collection);
  this.server_ = connection;

  var timeout = FIRST_STATS_MIN_TIME + (FIRST_STATS_MAX_TIME - FIRST_STATS_MIN_TIME) * Math.random();
  setTimeoutNonBlocking(this.reportStats_.bind(this), Math.floor(timeout));
};

StatsReporter.prototype.includeStat = function(stat) {
  this.statsToReport_[stat] = true;
};

StatsReporter.prototype.reportStats_ = function() {
  var stats = this.statsListener_.get();
  var reportedStats = { };
  var haveStatsToReport = false;
  for (var stat in stats) {
    if (stats[stat] > 0 && contains(this.statsToReport_, stat)) {
      reportedStats[stat] = stats[stat];
      haveStatsToReport = true;
    }
  }

  if (haveStatsToReport) {
    this.server_.reportStats(reportedStats);
  }

  // queue our next run.
  setTimeoutNonBlocking(this.reportStats_.bind(this), Math.floor(Math.random() * 2 * REPORT_STATS_INTERVAL));
};

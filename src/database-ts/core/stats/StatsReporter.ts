import { contains } from "../../../utils/libs/object";
import { StatsListener } from "./StatsListener";
import { setTimeoutNonBlocking } from "../util/util";

// Assuming some apps may have a short amount of time on page, and a bulk of firebase operations probably
// happen on page load, we try to report our first set of stats pretty quickly, but we wait at least 10
// seconds to try to ensure the Firebase connection is established / settled.
const FIRST_STATS_MIN_TIME = 10 * 1000;
const FIRST_STATS_MAX_TIME = 30 * 1000;

// We'll continue to report stats on average every 5 minutes.
const REPORT_STATS_INTERVAL = 5 * 60 * 1000;

export class StatsReporter {
  private statsToReport = {};
  private statsListener;

  constructor(collection, public connection) {
    this.statsListener = new StatsListener(collection);
    var timeout = FIRST_STATS_MIN_TIME + (FIRST_STATS_MAX_TIME - FIRST_STATS_MIN_TIME) * Math.random();
    setTimeoutNonBlocking(this.reportStats.bind(this), Math.floor(timeout));
  };

  includeStat(stat) {
    this.statsToReport[stat] = true;
  };

  private reportStats() {
    var stats = this.statsListener.get();
    var reportedStats = { };
    var haveStatsToReport = false;
    for (var stat in stats) {
      if (stats[stat] > 0 && contains(this.statsToReport, stat)) {
        reportedStats[stat] = stats[stat];
        haveStatsToReport = true;
      }
    }

    if (haveStatsToReport) {
      this.connection.reportStats(reportedStats);
    }

    // queue our next run.
    setTimeoutNonBlocking(this.reportStats.bind(this), Math.floor(Math.random() * 2 * REPORT_STATS_INTERVAL));
  };
}

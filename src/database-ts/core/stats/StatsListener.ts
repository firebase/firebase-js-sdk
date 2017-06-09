import { clone } from "../../../utils/libs/object";

/**
 * Returns the delta from the previous call to get stats.
 *
 * @param collection The collection to "listen" to.
 * @constructor
 */
export class StatsListener {
  private last = null;
  constructor(private collection) {};
  get() {
    var newStats = this.collection.get();

    var delta = clone(newStats);
    if (this.last) {
      for (var stat in this.last) {
        delta[stat] = delta[stat] - this.last[stat];
      }
    }
    this.last = newStats;

    return delta;
  }
}
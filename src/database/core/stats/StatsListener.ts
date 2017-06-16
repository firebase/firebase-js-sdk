import { clone } from "../../../utils/obj";

/**
 * Returns the delta from the previous call to get stats.
 *
 * @param collection_ The collection to "listen" to.
 * @constructor
 */
export class StatsListener {
  private last_ = null;
  
  constructor(private collection_) {
  }

  get() {
    const newStats = this.collection_.get();

    const delta = clone(newStats);
    if (this.last_) {
      for (let stat in this.last_) {
        delta[stat] = delta[stat] - this.last_[stat];
      }
    }
    this.last_ = newStats;

    return delta;
  }
}


import { clone } from "../../../utils/obj";

/**
 * Returns the delta from the previous call to get stats.
 *
 * @param collection The collection to "listen" to.
 * @constructor
 */
export class StatsListener {
  collection_;
  last_;
  
  constructor(collection) {
    this.collection_ = collection;
    this.last_ = null;
  }
  get() {
    var newStats = this.collection_.get();

    var delta = clone(newStats);
    if (this.last_) {
      for (var stat in this.last_) {
        delta[stat] = delta[stat] - this.last_[stat];
      }
    }
    this.last_ = newStats;

    return delta;
  }
}


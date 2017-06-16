import { clone, forEach } from '../../../utils/obj';

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
      forEach(this.last_, (stat, value) => {
        delta[stat] = delta[stat] - value;
      });
    }
    this.last_ = newStats;

    return delta;
  }
}


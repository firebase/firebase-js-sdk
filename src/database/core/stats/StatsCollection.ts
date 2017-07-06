import { deepCopy } from '../../../utils/deep_copy';
import { contains } from '../../../utils/obj';

/**
 * Tracks a collection of stats.
 *
 * @constructor
 */
export class StatsCollection {
  counters_: object;
  constructor() {
    this.counters_ = { };
  }
  incrementCounter(name, amount) {
    if (amount === undefined)
      amount = 1;

    if (!contains(this.counters_, name))
      this.counters_[name] = 0;

    this.counters_[name] += amount;
  }
  get() {
    return deepCopy(this.counters_);
  };
}


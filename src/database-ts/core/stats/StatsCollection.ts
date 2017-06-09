import { 
  clone, 
  contains 
} from "../../../utils/libs/object";

export class StatsCollection {
  static collections = {};
  static reporters = {};
  private counters = {};
  get() {
    return clone(this.counters);
  }
  incrementCounter(name, amount) {
    if (amount === undefined)
      amount = 1;

    if (!contains(this.counters, name))
      this.counters[name] = 0;

    this.counters[name] += amount;
  }
}
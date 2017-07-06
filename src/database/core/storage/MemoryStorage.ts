import { contains } from "../../../utils/obj";

/**
 * An in-memory storage implementation that matches the API of DOMStorageWrapper
 * (TODO: create interface for both to implement).
 *
 * @constructor
 */
export class MemoryStorage {
  cache_: object;
  constructor() {
    this.cache_ = {};
  }
  set(key, value) {
    if (value == null) {
      delete this.cache_[key];
    } else {
      this.cache_[key] = value;
    }
  };

  get(key) {
    if (contains(this.cache_, key)) {
      return this.cache_[key];
    }
    return null;
  };

  remove(key) {
    delete this.cache_[key];
  };

  isInMemoryStorage = true;
}

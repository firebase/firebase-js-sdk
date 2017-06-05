import { Promise } from "./Promise";

export class Deferred {
  public resolve: Function | null = null;
  public reject: Function | null = null;
  public promise = new Promise((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });

  /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     * @param {((?function(?(Error)): (?|undefined))| (?function(?(Error),?=): (?|undefined)))=} opt_nodeCallback
     * @return {!function(?(Error), ?=)}
     */
  wrapCallback(nodeCallback?) {
    var self = this;
    /**
     * @param {?Error} error
     * @param {?=} opt_value
     */
    return (error, value?) => {
      if (error) {
        this.reject(error);
      } else {
        this.resolve(value);
      }
      if (typeof nodeCallback === 'function') {
        // A dummy error handler
        this.promise.catch(() => {});

        // Some of our callbacks don't expect a value and our own tests
        // assert that the parameter length is 1
        if (nodeCallback.length === 1) {
          nodeCallback(error);
        } else {
          nodeCallback(error, value);
        }
      }
    };
  }
}
export class Deferred<R> {
  promise: Promise<R>;
  reject;
  resolve;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  
  /**
  * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
  * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
  * and returns a node-style callback which will resolve or reject the Deferred's promise.
  * @param {((?function(?(Error)): (?|undefined))| (?function(?(Error),?=): (?|undefined)))=} callback
  * @return {!function(?(Error), ?=)}
  */
  wrapCallback(callback?) {
    return (error, value?) => {
      if (error) {
        this.reject(error);
      } else {
        this.resolve(value);
      }
      if (typeof callback === 'function') {
        // Attaching noop handler just in case developer wasn't expecting
        // promises
        this.promise.catch(() => {});
        
        // Some of our callbacks don't expect a value and our own tests
        // assert that the parameter length is 1
        if (callback.length === 1) {
          callback(error);
        } else {
          callback(error, value);
        }
      }
    };
  }
}
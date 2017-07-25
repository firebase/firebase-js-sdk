/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import { globalScope } from '../utils/globalScope';

export const PromiseImpl = globalScope.Promise || require('promise-polyfill');

/**
 * A deferred promise implementation.
 */
export class Deferred {
  resolve;
  reject;
  promise;

  /** @constructor */
  constructor() {
    var self = this;
    this.resolve = null;
    this.reject = null;
    this.promise = new PromiseImpl(function(resolve, reject) {
      self.resolve = resolve;
      self.reject = reject;
    });
  }

  /**
   * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
   * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
   * and returns a node-style callback which will resolve or reject the Deferred's promise.
   * @param {((?function(?(Error)): (?|undefined))| (?function(?(Error),?=): (?|undefined)))=} opt_nodeCallback
   * @return {!function(?(Error), ?=)}
   */
  wrapCallback(opt_nodeCallback?) {
    var self = this;
    /**
       * @param {?Error} error
       * @param {?=} opt_value
       */
    function meta(error, opt_value) {
      if (error) {
        self.reject(error);
      } else {
        self.resolve(opt_value);
      }
      if (typeof opt_nodeCallback === 'function') {
        attachDummyErrorHandler(self.promise);

        // Some of our callbacks don't expect a value and our own tests
        // assert that the parameter length is 1
        if (opt_nodeCallback.length === 1) {
          opt_nodeCallback(error);
        } else {
          opt_nodeCallback(error, opt_value);
        }
      }
    }
    return meta;
  }
}

/**
 * Chrome (and maybe other browsers) report an Error in the console if you reject a promise
 * and nobody handles the error. This is normally a good thing, but this will confuse devs who
 * never intended to use promises in the first place. So in some cases (in particular, if the
 * developer attached a callback), we should attach a dummy resolver to the promise to suppress
 * this error.
 *
 * Note: We can't do this all the time, since it breaks the Promise spec (though in the obscure
 * 3.3.3 section related to upgrading non-compliant promises).
 * @param {!firebase.Promise} promise
 */
export const attachDummyErrorHandler = function(promise) {
  promise.catch(() => {});
};

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

import { Reference } from "./Reference";
import { Repo } from "../core/Repo";
import { Path } from "../core/util/Path";
import { QueryParams } from "../core/view/QueryParams";
import { 
  errorPrefix,
  validateArgCount,
  validateCallback,
  validateContextObject,
} from "../../utils/libs/validation";
import { 
  validateEventType, 
  validateFirebaseDataArg,
  validateKey,
} from "../core/util/validation";
import { Deferred } from "../../utils/classes/Deferred";
import { 
  ChildEventRegistration,
  ValueEventRegistration 
} from "../core/view/EventRegistration";

export class Query {
  constructor(public repo: Repo, public path: Path, private queryParams: QueryParams, private orderByCalled: boolean) {}
  endAt(value, name?) {
    validateArgCount('Query.endAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.endAt', 1, value, this.path, true);
    validateKey('Query.endAt', 2, name, true);

    var newParams = this.queryParams.endAt(value, name);
    this.validateLimit(newParams);
    this.validateQueryEndpoints(newParams);
    if (this.queryParams.hasEnd()) {
      throw new Error('Query.endAt: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }

    return new Query(this.repo, this.path, newParams, this.orderByCalled);
  }
  equalTo(value, name) {
    validateArgCount('Query.equalTo', 1, 2, arguments.length);
    validateFirebaseDataArg('Query.equalTo', 1, value, this.path, false);
    validateKey('Query.equalTo', 2, name, true);
    if (this.queryParams.hasStart()) {
      throw new Error('Query.equalTo: Starting point was already set (by another call to startAt or ' +
          'equalTo).');
    }
    if (this.queryParams.hasEnd()) {
      throw new Error('Query.equalTo: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }
    return this.startAt(value, name).endAt(value, name);
  }

  private getCancelAndContextArgs(fnName?, cancelOrContext?, context?) {
    var ret = {cancel: null, context: null};
    if (cancelOrContext && context) {
      ret.cancel = cancelOrContext;
      validateCallback(fnName, 3, ret.cancel, true);

      ret.context = context;
      validateContextObject(fnName, 4, ret.context, true);
    } else if (cancelOrContext) { // we have either a cancel callback or a context.
      if (typeof cancelOrContext === 'object' && cancelOrContext !== null) { // it's a context!
        ret.context = cancelOrContext;
      } else if (typeof cancelOrContext === 'function') {
        ret.cancel = cancelOrContext;
      } else {
        throw new Error(errorPrefix(fnName, 3, true) + ' must either be a cancel callback or a context object.');
      }
    }
    return ret;
  }
  
  getQueryParams() {
    return this.queryParams;
  }
  
  getRef() {
    validateArgCount('Query.ref', 0, 0, arguments.length);
    // This is a slight hack. We cannot goog.require('fb.api.Firebase'), since Firebase requires fb.api.Query.
    // However, we will always export 'Firebase' to the global namespace, so it's guaranteed to exist by the time this
    // method gets called.
    return new Reference(this.repo, this.path);
  }
  isEqual(other) {
    validateArgCount('Query.isEqual', 1, 1, arguments.length);
    if (!(other instanceof Query)) {
      var error = 'Query.isEqual failed: First argument must be an instance of firebase.database.Query.';
      throw new Error(error);
    }

    var sameRepo = (this.repo === other.repo);
    var samePath = this.path.equals(other.path);
    var sameQueryIdentifier = (this.queryIdentifier() === other.queryIdentifier());

    return (sameRepo && samePath && sameQueryIdentifier);
  }
  limitToFirst(limit) {
    validateArgCount('Query.limitToFirst', 1, 1, arguments.length);
    if (typeof limit !== 'number' || Math.floor(limit) !== limit || limit <= 0) {
      throw new Error('Query.limitToFirst: First argument must be a positive integer.');
    }
    if (this.queryParams.hasLimit()) {
      throw new Error('Query.limitToFirst: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).');
    }

    return new Query(this.repo, this.path, this.queryParams.limitToFirst(limit), this.orderByCalled);
  }
  limitToLast(limit) {
    validateArgCount('Query.limitToLast', 1, 1, arguments.length);
    if (typeof limit !== 'number' || Math.floor(limit) !== limit || limit <= 0) {
      throw new Error('Query.limitToLast: First argument must be a positive integer.');
    }
    if (this.queryParams.hasLimit()) {
      throw new Error('Query.limitToLast: Limit was already set (by another call to limit, ' +
          'limitToFirst, or limitToLast).');
    }

    return new Query(this.repo, this.path, this.queryParams.limitToLast(limit), this.orderByCalled);
  }
  off(eventType?, callback?, context?) {
    validateArgCount('Query.off', 0, 3, arguments.length);
    validateEventType('Query.off', 1, eventType, true);
    validateCallback('Query.off', 2, callback, true);
    validateContextObject('Query.off', 3, context, true);

    var container = null;
    var callbacks = null;
    if (eventType === 'value') {
      var valueCallback = /** @type {function(!fb.api.DataSnapshot)} */ (callback) || null;
      container = new ValueEventRegistration(valueCallback, null, context || null);
    } else if (eventType) {
      if (callback) {
        callbacks = {};
        callbacks[eventType] = callback;
      }
      container = new ChildEventRegistration(callbacks, null, context || null);
    }
    this.repo.removeEventCallbackForQuery(this, container);
  }
  on(eventType, callback, cancelCallbackOrContext?, context?) {
    validateArgCount('Query.on', 2, 4, arguments.length);
    validateEventType('Query.on', 1, eventType, false);
    validateCallback('Query.on', 2, callback, false);

    var ret = this.getCancelAndContextArgs('Query.on', cancelCallbackOrContext, context);

    if (eventType === 'value') {
      this.onValueEvent(callback, ret.cancel, ret.context);
    } else {
      var callbacks = {};
      callbacks[eventType] = callback;
      this.onChildEvent(callbacks, ret.cancel, ret.context);
    }
    return callback;
  }
  once(eventType, userCallback) {
    validateArgCount('Query.once', 1, 4, arguments.length);
    validateEventType('Query.once', 1, eventType, false);
    validateCallback('Query.once', 2, userCallback, true);

    var ret = this.getCancelAndContextArgs('Query.once', arguments[2], arguments[3]);

    // TODO: Implement this more efficiently (in particular, use 'get' wire protocol for 'value' event)
    // TODO: consider actually wiring the callbacks into the promise. We cannot do this without a breaking change
    // because the API currently expects callbacks will be called synchronously if the data is cached, but this is
    // against the Promise specification.
    var self = this, firstCall = true;
    var deferred = new Deferred();
    deferred.promise.catch(() => {});

    var onceCallback = function(snapshot) {
      // NOTE: Even though we unsubscribe, we may get called multiple times if a single action (e.g. set() with JSON)
      // triggers multiple events (e.g. child_added or child_changed).
      if (firstCall) {
        firstCall = false;
        self.off(eventType, onceCallback);

        if (userCallback) {
          userCallback.bind(ret.context)(snapshot);
        }
        deferred.resolve(snapshot);
      }
    };

    this.on(eventType, onceCallback, /*cancel=*/ function(err) {
      self.off(eventType, onceCallback);

      if (ret.cancel)
        ret.cancel.bind(ret.context)(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }
  onChildEvent(callbacks, cancelCallback, context) {
    var container = new ChildEventRegistration(callbacks, cancelCallback, context);
    this.repo.addEventCallbackForQuery(this, container);
  }
  onValueEvent(callback, cancelCallback, context) {}
  orderByChild() {}
  orderByKey() {}
  orderByPriority() {}
  orderByValue() {}
  queryIdentifier() {}
  queryObject() {}
  startAt(value, name?) {
    validateArgCount('Query.startAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.startAt', 1, value, this.path, true);
    validateKey('Query.startAt', 2, name, true);

    var newParams = this.queryParams.startAt(value, name);
    this.validateLimit(newParams);
    this.validateQueryEndpoints(newParams);
    if (this.queryParams.hasStart()) {
      throw new Error('Query.startAt: Starting point was already set (by another call to startAt ' +
          'or equalTo).');
    }

    // Calling with no params tells us to start at the beginning.
    if (value === undefined) {
      value = null;
      name = null;
    }
    return new Query(this.repo, this.path, newParams, this.orderByCalled);
  }
  toJSON() {}
  toString() {}
  private validateLimit(params) {}
  private validateNoPreviousOrderByCall() {}
  private validateQueryEndpoints(params) {}
}
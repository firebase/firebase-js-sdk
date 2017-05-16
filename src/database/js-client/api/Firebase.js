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
// TODO(koss): Change to provide fb.api.Firebase - no longer provide the global.
goog.provide('Firebase');

goog.require('fb.api.INTERNAL');
goog.require('fb.api.OnDisconnect');
goog.require('fb.api.Query');
goog.require('fb.api.TEST_ACCESS');
goog.require('fb.api.TransactionResult');
goog.require('fb.constants');
goog.require('fb.core.Repo');
goog.require('fb.core.RepoManager');
goog.require('fb.core.util');
goog.require('fb.core.util.Path');
goog.require('fb.core.util.nextPushId');
goog.require('fb.core.util.validation');
goog.require('fb.core.view.QueryParams');
goog.require('fb.util.obj');
goog.require('fb.util.promise');
goog.require('fb.util.promise.Deferred');
goog.require('fb.util.validation');


/** @interface */
function letMeUseMapAccessors() {}


Firebase = goog.defineClass(fb.api.Query, {
  /**
   * Call options:
   *   new Firebase(Repo, Path) or
   *   new Firebase(url: string, string|RepoManager)
   *
   * Externally - this is the firebase.database.Reference type.
   *
   * @param {!fb.core.Repo} repo
   * @param {(!fb.core.util.Path)} path
   * @extends {fb.api.Query}
   */
  constructor: function(repo, path) {
    if (!(repo instanceof fb.core.Repo)) {
      throw new Error("new Firebase() no longer supported - use app.database().");
    }

    // call Query's constructor, passing in the repo and path.
    fb.api.Query.call(this, repo, path, fb.core.view.QueryParams.DEFAULT,
                      /*orderByCalled=*/false);

    /**
     * When defined is the then function for the promise + Firebase hybrid
     * returned by push() When then is defined, catch will be as well, though
     * it's created using some hackery to get around conflicting ES3 and Closure
     * Compiler limitations.
     * @type {Function|undefined}
     */
    this.then = void 0;
    /** @type {letMeUseMapAccessors} */ (this)['catch'] = void 0;
  },

  /** @return {?string} */
  getKey: function() {
    fb.util.validation.validateArgCount('Firebase.key', 0, 0, arguments.length);

    if (this.path.isEmpty())
      return null;
    else
      return this.path.getBack();
  },

  /**
   * @param {!(string|fb.core.util.Path)} pathString
   * @return {!Firebase}
   */
  child: function(pathString) {
    fb.util.validation.validateArgCount('Firebase.child', 1, 1, arguments.length);
    if (goog.isNumber(pathString)) {
      pathString = String(pathString);
    } else if (!(pathString instanceof fb.core.util.Path)) {
      if (this.path.getFront() === null)
        fb.core.util.validation.validateRootPathString('Firebase.child', 1, pathString, false);
      else
        fb.core.util.validation.validatePathString('Firebase.child', 1, pathString, false);
    }

    return new Firebase(this.repo, this.path.child(pathString));
  },

  /** @return {?Firebase} */
  getParent: function() {
    fb.util.validation.validateArgCount('Firebase.parent', 0, 0, arguments.length);

    var parentPath = this.path.parent();
    return parentPath === null ? null : new Firebase(this.repo, parentPath);
  },

  /** @return {!Firebase} */
  getRoot: function() {
    fb.util.validation.validateArgCount('Firebase.ref', 0, 0, arguments.length);

    var ref = this;
    while (ref.getParent() !== null) {
      ref = ref.getParent();
    }
    return ref;
  },

  /** @return {!fb.api.Database} */
  databaseProp: function() {
    return this.repo.database;
  },

  /**
   * @param {*} newVal
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  set: function(newVal, opt_onComplete) {
    fb.util.validation.validateArgCount('Firebase.set', 1, 2, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.set', this.path);
    fb.core.util.validation.validateFirebaseDataArg('Firebase.set', 1, newVal, this.path, false);
    fb.util.validation.validateCallback('Firebase.set', 2, opt_onComplete, true);

    var deferred = new fb.util.promise.Deferred();
    this.repo.setWithPriority(this.path, newVal, /*priority=*/ null, deferred.wrapCallback(opt_onComplete));
    return deferred.promise;
  },

  /**
   * @param {!Object} objectToMerge
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  update: function(objectToMerge, opt_onComplete) {
    fb.util.validation.validateArgCount('Firebase.update', 1, 2, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.update', this.path);

    if (goog.isArray(objectToMerge)) {
      var newObjectToMerge = {};
      for (var i = 0; i < objectToMerge.length; ++i) {
        newObjectToMerge['' + i] = objectToMerge[i];
      }
      objectToMerge = newObjectToMerge;
      fb.core.util.warn('Passing an Array to Firebase.update() is deprecated. ' +
                        'Use set() if you want to overwrite the existing data, or ' +
                        'an Object with integer keys if you really do want to ' +
                        'only update some of the children.'
      );
    }
    fb.core.util.validation.validateFirebaseMergeDataArg('Firebase.update', 1, objectToMerge, this.path, false);
    fb.util.validation.validateCallback('Firebase.update', 2, opt_onComplete, true);
    var deferred = new fb.util.promise.Deferred();
    this.repo.update(this.path, objectToMerge, deferred.wrapCallback(opt_onComplete));
    return deferred.promise;
  },

  /**
   * @param {*} newVal
   * @param {string|number|null} newPriority
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  setWithPriority: function(newVal, newPriority, opt_onComplete) {
    fb.util.validation.validateArgCount('Firebase.setWithPriority', 2, 3, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.setWithPriority', this.path);
    fb.core.util.validation.validateFirebaseDataArg('Firebase.setWithPriority', 1, newVal, this.path, false);
    fb.core.util.validation.validatePriority('Firebase.setWithPriority', 2, newPriority, false);
    fb.util.validation.validateCallback('Firebase.setWithPriority', 3, opt_onComplete, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys')
      throw 'Firebase.setWithPriority failed: ' + this.getKey() + ' is a read-only object.';

    var deferred = new fb.util.promise.Deferred();
    this.repo.setWithPriority(this.path, newVal, newPriority, deferred.wrapCallback(opt_onComplete));
    return deferred.promise;
  },

  /**
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  remove: function(opt_onComplete) {
    fb.util.validation.validateArgCount('Firebase.remove', 0, 1, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.remove', this.path);
    fb.util.validation.validateCallback('Firebase.remove', 1, opt_onComplete, true);

    return this.set(null, opt_onComplete);
  },

  /**
   * @param {function(*):*} transactionUpdate
   * @param {(function(?Error, boolean, ?fb.api.DataSnapshot))=} opt_onComplete
   * @param {boolean=} opt_applyLocally
   * @return {!firebase.Promise}
   */
  transaction: function(transactionUpdate, opt_onComplete, opt_applyLocally) {
    fb.util.validation.validateArgCount('Firebase.transaction', 1, 3, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.transaction', this.path);
    fb.util.validation.validateCallback('Firebase.transaction', 1, transactionUpdate, false);
    fb.util.validation.validateCallback('Firebase.transaction', 2, opt_onComplete, true);
    // NOTE: opt_applyLocally is an internal-only option for now.  We need to decide if we want to keep it and how
    // to expose it.
    fb.core.util.validation.validateBoolean('Firebase.transaction', 3, opt_applyLocally, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys')
      throw 'Firebase.transaction failed: ' + this.getKey() + ' is a read-only object.';

    if (typeof opt_applyLocally === 'undefined')
      opt_applyLocally = true;

    var deferred = new fb.util.promise.Deferred();
    if (goog.isFunction(opt_onComplete)) {
      fb.util.promise.attachDummyErrorHandler(deferred.promise);
    }

    var promiseComplete = function(error, committed, snapshot) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(new fb.api.TransactionResult(committed, snapshot));
      }
      if (goog.isFunction(opt_onComplete)) {
        opt_onComplete(error, committed, snapshot);
      }
    };
    this.repo.startTransaction(this.path, transactionUpdate, promiseComplete, opt_applyLocally);

    return deferred.promise;
  },

  /**
   * @param {string|number|null} priority
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  setPriority: function(priority, opt_onComplete) {
    fb.util.validation.validateArgCount('Firebase.setPriority', 1, 2, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.setPriority', this.path);
    fb.core.util.validation.validatePriority('Firebase.setPriority', 1, priority, false);
    fb.util.validation.validateCallback('Firebase.setPriority', 2, opt_onComplete, true);

    var deferred = new fb.util.promise.Deferred();
    this.repo.setWithPriority(this.path.child('.priority'), priority, null, deferred.wrapCallback(opt_onComplete));
    return deferred.promise;
  },

  /**
   * @param {*=} opt_value
   * @param {function(?Error)=} opt_onComplete
   * @return {!Firebase}
   */
  push: function(opt_value, opt_onComplete) {
    fb.util.validation.validateArgCount('Firebase.push', 0, 2, arguments.length);
    fb.core.util.validation.validateWritablePath('Firebase.push', this.path);
    fb.core.util.validation.validateFirebaseDataArg('Firebase.push', 1, opt_value, this.path, true);
    fb.util.validation.validateCallback('Firebase.push', 2, opt_onComplete, true);

    var now = this.repo.serverTime();
    var name = fb.core.util.nextPushId(now);

    // push() returns a ThennableReference whose promise is fulfilled with a regular Reference.
    // We use child() to create handles to two different references. The first is turned into a
    // ThennableReference below by adding then() and catch() methods and is used as the
    // return value of push(). The second remains a regular Reference and is used as the fulfilled
    // value of the first ThennableReference.
    var thennablePushRef = this.child(name);
    var pushRef = this.child(name);

    var promise;
    if (goog.isDefAndNotNull(opt_value)) {
      promise = thennablePushRef.set(opt_value, opt_onComplete).then(function () { return pushRef; });
    } else {
      promise = fb.util.promise.Promise.resolve(pushRef);
    }

    thennablePushRef.then = goog.bind(promise.then, promise);
    /** @type {letMeUseMapAccessors} */ (thennablePushRef)["catch"] = goog.bind(promise.then, promise, void 0);

    if (goog.isFunction(opt_onComplete)) {
      fb.util.promise.attachDummyErrorHandler(promise);
    }

    return thennablePushRef;
  },

  /**
   * @return {!fb.api.OnDisconnect}
   */
  onDisconnect: function() {
    fb.core.util.validation.validateWritablePath('Firebase.onDisconnect', this.path);
    return new fb.api.OnDisconnect(this.repo, this.path);
  }
}); // end Firebase


// Export Firebase (Reference) methods
goog.exportProperty(Firebase.prototype, 'child', Firebase.prototype.child);
goog.exportProperty(Firebase.prototype, 'set', Firebase.prototype.set);
goog.exportProperty(Firebase.prototype, 'update', Firebase.prototype.update);
goog.exportProperty(Firebase.prototype, 'setWithPriority', Firebase.prototype.setWithPriority);
goog.exportProperty(Firebase.prototype, 'remove', Firebase.prototype.remove);
goog.exportProperty(Firebase.prototype, 'transaction', Firebase.prototype.transaction);
goog.exportProperty(Firebase.prototype, 'setPriority', Firebase.prototype.setPriority);
goog.exportProperty(Firebase.prototype, 'push', Firebase.prototype.push);
goog.exportProperty(Firebase.prototype, 'onDisconnect', Firebase.prototype.onDisconnect);

// Internal code should NOT use these exported properties - because when they are
// minified, they will refernce the minified name.  We could fix this by including
// our our externs file for all our exposed symbols.
fb.core.util.exportPropGetter(Firebase.prototype, 'database', Firebase.prototype.databaseProp);
fb.core.util.exportPropGetter(Firebase.prototype, 'key', Firebase.prototype.getKey);
fb.core.util.exportPropGetter(Firebase.prototype, 'parent', Firebase.prototype.getParent);
fb.core.util.exportPropGetter(Firebase.prototype, 'root', Firebase.prototype.getRoot);

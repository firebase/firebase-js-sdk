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
goog.provide('fb.api.OnDisconnect');
goog.require('fb.core.util');
goog.require('fb.core.util.validation');
goog.require('fb.util.promise.Deferred');
goog.require('fb.util.validation');



/**
 * @constructor
 * @param {!fb.core.Repo} repo
 * @param {!fb.core.util.Path} path
 */
fb.api.OnDisconnect = function(repo, path) {
  /** @private */
  this.repo_ = repo;

  /** @private */
  this.path_ = path;
};


/**
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
fb.api.OnDisconnect.prototype.cancel = function(opt_onComplete) {
  fb.util.validation.validateArgCount('Firebase.onDisconnect().cancel', 0, 1, arguments.length);
  fb.util.validation.validateCallback('Firebase.onDisconnect().cancel', 1, opt_onComplete, true);
  var deferred = new fb.util.promise.Deferred();
  this.repo_.onDisconnectCancel(this.path_, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};
goog.exportProperty(fb.api.OnDisconnect.prototype, 'cancel', fb.api.OnDisconnect.prototype.cancel);


/**
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
fb.api.OnDisconnect.prototype.remove = function(opt_onComplete) {
  fb.util.validation.validateArgCount('Firebase.onDisconnect().remove', 0, 1, arguments.length);
  fb.core.util.validation.validateWritablePath('Firebase.onDisconnect().remove', this.path_);
  fb.util.validation.validateCallback('Firebase.onDisconnect().remove', 1, opt_onComplete, true);
  var deferred = new fb.util.promise.Deferred();
  this.repo_.onDisconnectSet(this.path_, null, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};
goog.exportProperty(fb.api.OnDisconnect.prototype, 'remove', fb.api.OnDisconnect.prototype.remove);


/**
 * @param {*} value
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
fb.api.OnDisconnect.prototype.set = function(value, opt_onComplete) {
  fb.util.validation.validateArgCount('Firebase.onDisconnect().set', 1, 2, arguments.length);
  fb.core.util.validation.validateWritablePath('Firebase.onDisconnect().set', this.path_);
  fb.core.util.validation.validateFirebaseDataArg('Firebase.onDisconnect().set', 1, value, this.path_, false);
  fb.util.validation.validateCallback('Firebase.onDisconnect().set', 2, opt_onComplete, true);
  var deferred = new fb.util.promise.Deferred();
  this.repo_.onDisconnectSet(this.path_, value, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};
goog.exportProperty(fb.api.OnDisconnect.prototype, 'set', fb.api.OnDisconnect.prototype.set);


/* TODO: Enable onDisconnect().setPriority(priority, callback)
fb.api.OnDisconnect.prototype.setPriority = function(priority, opt_onComplete)
  fb.util.validation.validateArgCount("Firebase.onDisconnect().setPriority", 1, 2, arguments.length);
  fb.core.util.validation.validateWritablePath('Firebase.onDisconnect().setPriority', this.path_);
  fb.core.util.validation.validatePriority("Firebase.onDisconnect().setPriority", 1, priority, false);
  fb.util.validation.validateCallback("Firebase.onDisconnect().setPriority", 2, opt_onComplete, true);
  this.repo_.onDisconnectSetPriority(this.path_, priority, opt_onComplete);
};
goog.exportProperty(fb.api.OnDisconnect.prototype, 'setPriority', fb.api.OnDisconnect.prototype.setPriority); */


/**
 * @param {*} value
 * @param {number|string|null} priority
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
fb.api.OnDisconnect.prototype.setWithPriority = function(value, priority, opt_onComplete) {
  fb.util.validation.validateArgCount('Firebase.onDisconnect().setWithPriority', 2, 3, arguments.length);
  fb.core.util.validation.validateWritablePath('Firebase.onDisconnect().setWithPriority', this.path_);
  fb.core.util.validation.validateFirebaseDataArg('Firebase.onDisconnect().setWithPriority',
                                                  1, value, this.path_, false);
  fb.core.util.validation.validatePriority('Firebase.onDisconnect().setWithPriority', 2, priority, false);
  fb.util.validation.validateCallback('Firebase.onDisconnect().setWithPriority', 3, opt_onComplete, true);

  var deferred = new fb.util.promise.Deferred();
  this.repo_.onDisconnectSetWithPriority(this.path_, value, priority, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};
goog.exportProperty(fb.api.OnDisconnect.prototype, 'setWithPriority', fb.api.OnDisconnect.prototype.setWithPriority);


/**
 * @param {!Object} objectToMerge
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
fb.api.OnDisconnect.prototype.update = function(objectToMerge, opt_onComplete) {
  fb.util.validation.validateArgCount('Firebase.onDisconnect().update', 1, 2, arguments.length);
  fb.core.util.validation.validateWritablePath('Firebase.onDisconnect().update', this.path_);
  if (goog.isArray(objectToMerge)) {
    var newObjectToMerge = {};
    for (var i = 0; i < objectToMerge.length; ++i) {
      newObjectToMerge['' + i] = objectToMerge[i];
    }
    objectToMerge = newObjectToMerge;
    fb.core.util.warn(
        'Passing an Array to Firebase.onDisconnect().update() is deprecated. Use set() if you want to overwrite the ' +
        'existing data, or an Object with integer keys if you really do want to only update some of the children.'
    );
  }
  fb.core.util.validation.validateFirebaseMergeDataArg('Firebase.onDisconnect().update', 1, objectToMerge,
      this.path_, false);
  fb.util.validation.validateCallback('Firebase.onDisconnect().update', 2, opt_onComplete, true);
  var deferred = new fb.util.promise.Deferred();
  this.repo_.onDisconnectUpdate(this.path_, objectToMerge, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};
goog.exportProperty(fb.api.OnDisconnect.prototype, 'update', fb.api.OnDisconnect.prototype.update);

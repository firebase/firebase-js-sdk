import { 
  validateArgCount,
  validateCallback
} from "../../utils/validation";
import {
  validateWritablePath,
  validateFirebaseDataArg,
  validatePriority,
  validateFirebaseMergeDataArg,
} from "../core/util/validation";
import { warn } from "../core/util/util";
import { Deferred } from "../../utils/promise";

/**
 * @constructor
 * @param {!Repo} repo
 * @param {!Path} path
 */
export const OnDisconnect = function(repo, path) {
  /** @private */
  this.repo_ = repo;

  /** @private */
  this.path_ = path;
};


/**
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
OnDisconnect.prototype.cancel = function(opt_onComplete) {
  validateArgCount('Firebase.onDisconnect().cancel', 0, 1, arguments.length);
  validateCallback('Firebase.onDisconnect().cancel', 1, opt_onComplete, true);
  var deferred = new Deferred();
  this.repo_.onDisconnectCancel(this.path_, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};

/**
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
OnDisconnect.prototype.remove = function(opt_onComplete) {
  validateArgCount('Firebase.onDisconnect().remove', 0, 1, arguments.length);
  validateWritablePath('Firebase.onDisconnect().remove', this.path_);
  validateCallback('Firebase.onDisconnect().remove', 1, opt_onComplete, true);
  var deferred = new Deferred();
  this.repo_.onDisconnectSet(this.path_, null, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};

/**
 * @param {*} value
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
OnDisconnect.prototype.set = function(value, opt_onComplete) {
  validateArgCount('Firebase.onDisconnect().set', 1, 2, arguments.length);
  validateWritablePath('Firebase.onDisconnect().set', this.path_);
  validateFirebaseDataArg('Firebase.onDisconnect().set', 1, value, this.path_, false);
  validateCallback('Firebase.onDisconnect().set', 2, opt_onComplete, true);
  var deferred = new Deferred();
  this.repo_.onDisconnectSet(this.path_, value, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};

/**
 * @param {*} value
 * @param {number|string|null} priority
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
OnDisconnect.prototype.setWithPriority = function(value, priority, opt_onComplete) {
  validateArgCount('Firebase.onDisconnect().setWithPriority', 2, 3, arguments.length);
  validateWritablePath('Firebase.onDisconnect().setWithPriority', this.path_);
  validateFirebaseDataArg('Firebase.onDisconnect().setWithPriority',
                                                  1, value, this.path_, false);
  validatePriority('Firebase.onDisconnect().setWithPriority', 2, priority, false);
  validateCallback('Firebase.onDisconnect().setWithPriority', 3, opt_onComplete, true);

  var deferred = new Deferred();
  this.repo_.onDisconnectSetWithPriority(this.path_, value, priority, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};

/**
 * @param {!Object} objectToMerge
 * @param {function(?Error)=} opt_onComplete
 * @return {!firebase.Promise}
 */
OnDisconnect.prototype.update = function(objectToMerge, opt_onComplete) {
  validateArgCount('Firebase.onDisconnect().update', 1, 2, arguments.length);
  validateWritablePath('Firebase.onDisconnect().update', this.path_);
  if (Array.isArray(objectToMerge)) {
    var newObjectToMerge = {};
    for (var i = 0; i < objectToMerge.length; ++i) {
      newObjectToMerge['' + i] = objectToMerge[i];
    }
    objectToMerge = newObjectToMerge;
    warn(
        'Passing an Array to Firebase.onDisconnect().update() is deprecated. Use set() if you want to overwrite the ' +
        'existing data, or an Object with integer keys if you really do want to only update some of the children.'
    );
  }
  validateFirebaseMergeDataArg('Firebase.onDisconnect().update', 1, objectToMerge,
      this.path_, false);
  validateCallback('Firebase.onDisconnect().update', 2, opt_onComplete, true);
  var deferred = new Deferred();
  this.repo_.onDisconnectUpdate(this.path_, objectToMerge, deferred.wrapCallback(opt_onComplete));
  return deferred.promise;
};

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
import { Repo } from '../core/Repo';
import { Path } from '../core/util/Path';

/**
 * @constructor
 */
export class OnDisconnect {
  /**
   * @param {!Repo} repo_
   * @param {!Path} path_
   */
  constructor(private repo_: Repo,
              private path_: Path) {
  }

  /**
   * @param {function(?Error)=} onComplete
   * @return {!firebase.Promise}
   */
  cancel(onComplete?) {
    validateArgCount('OnDisconnect.cancel', 0, 1, arguments.length);
    validateCallback('OnDisconnect.cancel', 1, onComplete, true);
    const deferred = new Deferred();
    this.repo_.onDisconnectCancel(this.path_, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {function(?Error)=} onComplete
   * @return {!firebase.Promise}
   */
  remove(onComplete?) {
    validateArgCount('OnDisconnect.remove', 0, 1, arguments.length);
    validateWritablePath('OnDisconnect.remove', this.path_);
    validateCallback('OnDisconnect.remove', 1, onComplete, true);
    const deferred = new Deferred();
    this.repo_.onDisconnectSet(this.path_, null, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {*} value
   * @param {function(?Error)=} onComplete
   * @return {!firebase.Promise}
   */
  set(value, onComplete?) {
    validateArgCount('OnDisconnect.set', 1, 2, arguments.length);
    validateWritablePath('OnDisconnect.set', this.path_);
    validateFirebaseDataArg('OnDisconnect.set', 1, value, this.path_, false);
    validateCallback('OnDisconnect.set', 2, onComplete, true);
    const deferred = new Deferred();
    this.repo_.onDisconnectSet(this.path_, value, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {*} value
   * @param {number|string|null} priority
   * @param {function(?Error)=} onComplete
   * @return {!firebase.Promise}
   */
  setWithPriority(value, priority, onComplete?) {
    validateArgCount('OnDisconnect.setWithPriority', 2, 3, arguments.length);
    validateWritablePath('OnDisconnect.setWithPriority', this.path_);
    validateFirebaseDataArg('OnDisconnect.setWithPriority',
      1, value, this.path_, false);
    validatePriority('OnDisconnect.setWithPriority', 2, priority, false);
    validateCallback('OnDisconnect.setWithPriority', 3, onComplete, true);

    const deferred = new Deferred();
    this.repo_.onDisconnectSetWithPriority(this.path_, value, priority, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {!Object} objectToMerge
   * @param {function(?Error)=} onComplete
   * @return {!firebase.Promise}
   */
  update(objectToMerge, onComplete?) {
    validateArgCount('OnDisconnect.update', 1, 2, arguments.length);
    validateWritablePath('OnDisconnect.update', this.path_);
    if (Array.isArray(objectToMerge)) {
      const newObjectToMerge = {};
      for (let i = 0; i < objectToMerge.length; ++i) {
        newObjectToMerge['' + i] = objectToMerge[i];
      }
      objectToMerge = newObjectToMerge;
      warn(
        'Passing an Array to firebase.database.onDisconnect().update() is deprecated. Use set() if you want to overwrite the ' +
        'existing data, or an Object with integer keys if you really do want to only update some of the children.'
      );
    }
    validateFirebaseMergeDataArg('OnDisconnect.update', 1, objectToMerge,
      this.path_, false);
    validateCallback('OnDisconnect.update', 2, onComplete, true);
    const deferred = new Deferred();
    this.repo_.onDisconnectUpdate(this.path_, objectToMerge, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }
}
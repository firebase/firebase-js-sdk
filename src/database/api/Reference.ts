import { OnDisconnect } from "./onDisconnect";
import { TransactionResult } from "./TransactionResult";
import { warn, exportPropGetter } from "../core/util/util";
import { nextPushId } from "../core/util/NextPushId";
import { Query } from "./Query";
import { Repo } from "../core/Repo";
import { Path } from "../core/util/Path";
import { QueryParams } from "../core/view/QueryParams";
import {
  validateRootPathString,
  validatePathString,
  validateFirebaseMergeDataArg,
  validateBoolean,
  validatePriority,
  validateFirebaseDataArg,
  validateWritablePath,
} from "../core/util/validation";
import {
  validateArgCount,
  validateCallback,
} from "../../utils/validation";
import { Deferred, attachDummyErrorHandler, PromiseImpl } from "../../utils/promise";
import { SyncPoint } from "../core/SyncPoint";

export class Reference extends Query {
  public then;
  public catch;
  /**
   * Call options:
   *   new Reference(Repo, Path) or
   *   new Reference(url: string, string|RepoManager)
   *
   * Externally - this is the firebase.database.Reference type.
   *
   * @param {!Repo} repo
   * @param {(!Path)} path
   * @extends {Query}
   */
  constructor(repo: Repo, path: Path) {
    if (!(repo instanceof Repo)) {
      throw new Error("new Reference() no longer supported - use app.database().");
    }

    // call Query's constructor, passing in the repo and path.
    super(repo, path, QueryParams.DEFAULT, false);
  }

  /** @return {?string} */
  getKey() {
    validateArgCount('Firebase.key', 0, 0, arguments.length);

    if (this.path.isEmpty())
      return null;
    else
      return this.path.getBack();
  }

  /**
   * @param {!(string|Path)} pathString
   * @return {!Firebase}
   */
  child(pathString) {
    validateArgCount('Firebase.child', 1, 1, arguments.length);
    if (typeof pathString === 'number') {
      pathString = String(pathString);
    } else if (!(pathString instanceof Path)) {
      if (this.path.getFront() === null)
        validateRootPathString('Firebase.child', 1, pathString, false);
      else
        validatePathString('Firebase.child', 1, pathString, false);
    }

    return new Reference(this.repo, this.path.child(pathString));
  }

  /** @return {?Firebase} */
  getParent() {
    validateArgCount('Firebase.parent', 0, 0, arguments.length);

    var parentPath = this.path.parent();
    return parentPath === null ? null : new Reference(this.repo, parentPath);
  }

  /** @return {!Firebase} */
  getRoot() {
    validateArgCount('Firebase.ref', 0, 0, arguments.length);

    var ref = <any>this;
    while (ref.getParent() !== null) {
      ref = ref.getParent();
    }
    return ref;
  }

  /** @return {!Database} */
  databaseProp() {
    return this.repo.database;
  }

  /**
   * @param {*} newVal
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  set(newVal, onComplete?): Promise<any> {
    validateArgCount('Firebase.set', 1, 2, arguments.length);
    validateWritablePath('Firebase.set', this.path);
    validateFirebaseDataArg('Firebase.set', 1, newVal, this.path, false);
    validateCallback('Firebase.set', 2, onComplete, true);

    var deferred = new Deferred();
    this.repo.setWithPriority(this.path, newVal, /*priority=*/ null, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {!Object} objectToMerge
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  update(objectToMerge, onComplete?) {
    validateArgCount('Firebase.update', 1, 2, arguments.length);
    validateWritablePath('Firebase.update', this.path);

    if (Array.isArray(objectToMerge)) {
      var newObjectToMerge = {};
      for (var i = 0; i < objectToMerge.length; ++i) {
        newObjectToMerge['' + i] = objectToMerge[i];
      }
      objectToMerge = newObjectToMerge;
      warn('Passing an Array to Firebase.update() is deprecated. ' +
                        'Use set() if you want to overwrite the existing data, or ' +
                        'an Object with integer keys if you really do want to ' +
                        'only update some of the children.'
      );
    }
    validateFirebaseMergeDataArg('Firebase.update', 1, objectToMerge, this.path, false);
    validateCallback('Firebase.update', 2, onComplete, true);
    var deferred = new Deferred();
    this.repo.update(this.path, objectToMerge, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {*} newVal
   * @param {string|number|null} newPriority
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  setWithPriority(newVal, newPriority, onComplete?) {
    validateArgCount('Firebase.setWithPriority', 2, 3, arguments.length);
    validateWritablePath('Firebase.setWithPriority', this.path);
    validateFirebaseDataArg('Firebase.setWithPriority', 1, newVal, this.path, false);
    validatePriority('Firebase.setWithPriority', 2, newPriority, false);
    validateCallback('Firebase.setWithPriority', 3, onComplete, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys')
      throw 'Firebase.setWithPriority failed: ' + this.getKey() + ' is a read-only object.';

    var deferred = new Deferred();
    this.repo.setWithPriority(this.path, newVal, newPriority, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  remove(onComplete?) {
    validateArgCount('Firebase.remove', 0, 1, arguments.length);
    validateWritablePath('Firebase.remove', this.path);
    validateCallback('Firebase.remove', 1, onComplete, true);

    return this.set(null, onComplete);
  }

  /**
   * @param {function(*):*} transactionUpdate
   * @param {(function(?Error, boolean, ?DataSnapshot))=} opt_onComplete
   * @param {boolean=} opt_applyLocally
   * @return {!firebase.Promise}
   */
  transaction(transactionUpdate, opt_onComplete, opt_applyLocally) {
    validateArgCount('Firebase.transaction', 1, 3, arguments.length);
    validateWritablePath('Firebase.transaction', this.path);
    validateCallback('Firebase.transaction', 1, transactionUpdate, false);
    validateCallback('Firebase.transaction', 2, opt_onComplete, true);
    // NOTE: opt_applyLocally is an internal-only option for now.  We need to decide if we want to keep it and how
    // to expose it.
    validateBoolean('Firebase.transaction', 3, opt_applyLocally, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys')
      throw 'Firebase.transaction failed: ' + this.getKey() + ' is a read-only object.';

    if (opt_applyLocally === undefined)
      opt_applyLocally = true;

    var deferred = new Deferred();
    if (typeof opt_onComplete === 'function') {
      attachDummyErrorHandler(deferred.promise);
    }

    var promiseComplete = function(error, committed, snapshot) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(new TransactionResult(committed, snapshot));
      }
      if (typeof opt_onComplete === 'function') {
        opt_onComplete(error, committed, snapshot);
      }
    };
    this.repo.startTransaction(this.path, transactionUpdate, promiseComplete, opt_applyLocally);

    return deferred.promise;
  }

  /**
   * @param {string|number|null} priority
   * @param {function(?Error)=} opt_onComplete
   * @return {!firebase.Promise}
   */
  setPriority(priority, onComplete?) {
    validateArgCount('Firebase.setPriority', 1, 2, arguments.length);
    validateWritablePath('Firebase.setPriority', this.path);
    validatePriority('Firebase.setPriority', 1, priority, false);
    validateCallback('Firebase.setPriority', 2, onComplete, true);

    var deferred = new Deferred();
    this.repo.setWithPriority(this.path.child('.priority'), priority, null, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }

  /**
   * @param {*=} opt_value
   * @param {function(?Error)=} opt_onComplete
   * @return {!Firebase}
   */
  push(value?, onComplete?) {
    validateArgCount('Firebase.push', 0, 2, arguments.length);
    validateWritablePath('Firebase.push', this.path);
    validateFirebaseDataArg('Firebase.push', 1, value, this.path, true);
    validateCallback('Firebase.push', 2, onComplete, true);

    var now = this.repo.serverTime();
    var name = nextPushId(now);

    // push() returns a ThennableReference whose promise is fulfilled with a regular Reference.
    // We use child() to create handles to two different references. The first is turned into a
    // ThennableReference below by adding then() and catch() methods and is used as the
    // return value of push(). The second remains a regular Reference and is used as the fulfilled
    // value of the first ThennableReference.
    var thennablePushRef = this.child(name);
    var pushRef = this.child(name);

    var promise;
    if (value != null) {
      promise = thennablePushRef.set(value, onComplete).then(function () { return pushRef; });
    } else {
      promise = PromiseImpl.resolve(pushRef);
    }

    thennablePushRef.then = promise.then.bind(promise);
    /** @type {letMeUseMapAccessors} */ (thennablePushRef)["catch"] = promise.then.bind(promise, undefined);

    if (typeof onComplete === 'function') {
      attachDummyErrorHandler(promise);
    }

    return thennablePushRef;
  }

  /**
   * @return {!OnDisconnect}
   */
  onDisconnect() {
    validateWritablePath('Firebase.onDisconnect', this.path);
    return new OnDisconnect(this.repo, this.path);
  }

  get database() {
    return this.databaseProp();
  }

  get key() {
    return this.getKey();
  }

  get parent() {
    return this.getParent();
  }

  get root() {
    return this.getRoot();
  }
}

/**
 * Define reference constructor in various modules
 * 
 * We are doing this here to avoid several circular
 * dependency issues
 */
Query.__referenceConstructor = Reference;
SyncPoint.__referenceConstructor = Reference;
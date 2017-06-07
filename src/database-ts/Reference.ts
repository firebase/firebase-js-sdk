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

import { Query } from './Query';
import { Path } from "./core/Path";
import { OnDisconnect } from "./OnDisconnect";
import { nextPushId } from "./utils/libs/nextPushId";
import { Promise } from "../utils/classes/Promise";
import { Deferred } from "../utils/classes/Deferred";
import { Repo } from "./core/Repo";
import { warn } from "../utils/libs/logger";
import { 
  validateArgCount,
  validatePathString,
  validateRootPathString,
  validateWritablePath,
  validateCallback,
  validateFirebaseDataArg,
  validatePriority,
  validateBoolean,
  validateFirebaseMergeDataArg
} from "../utils/libs/validation";
import { QueryParams } from "./utils/classes/QueryParams";

export interface TransactionResult {
  committed: any,
  snapshot: any
}

export class Reference extends Query {
  public path: Path;
  public then: Function;
  public catch: Function;
  constructor(public repo: Repo, rawPath: Path) {
    super(repo, rawPath, QueryParams.DEFAULT, false);
  }

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
  databaseProp() {
    return this.repo.database;
  }
  getKey(...args): string | null {
    validateArgCount('Firebase.key', 0, 0, args.length);

    if (this.path.isEmpty())
      return null;
    else
      return this.path.getBack();
  }
  getParent() {
    validateArgCount('Firebase.parent', 0, 0, arguments.length);

    var parentPath = this.path.parent();
    return parentPath === null ? null : new Reference(this.repo, parentPath);
  }
  getRoot() {
    validateArgCount('Firebase.ref', 0, 0, arguments.length);

    let ref = <Reference>this;

    while (ref.getParent() !== null) {
      ref = ref.getParent();
    }

    return ref;
  }
  onDisconnect() {
    validateWritablePath('Firebase.onDisconnect', this.path);
    return new OnDisconnect(this.repo, this.path);
  }
  push(value?, onComplete?) {
    validateArgCount('Firebase.push', 0, 2, arguments.length);
    validateWritablePath('Firebase.push', this.path);
    validateFirebaseDataArg('Firebase.push', 1, value, this.path, true);
    validateCallback('Firebase.push', 2, onComplete, true);

    const now = this.repo.serverTime();
    const name = nextPushId(now);

    // push() returns a ThennableReference whose promise is fulfilled with a regular Reference.
    // We use child() to create handles to two different references. The first is turned into a
    // ThennableReference below by adding then() and catch() methods and is used as the
    // return value of push(). The second remains a regular Reference and is used as the fulfilled
    // value of the first ThennableReference.
    const thennablePushRef = this.child(name);
    const pushRef = this.child(name);

    let promise;
    if (value != null) {
      promise = thennablePushRef.set(value, onComplete).then(function () { return pushRef; });
    } else {
      promise = Promise.resolve(pushRef);
    }

    thennablePushRef.then = promise.then.bind(promise);
    thennablePushRef.catch = promise.catch.bind(promise);

    if (typeof onComplete === 'function') {
      promise.catch(() => {});
    }

    return thennablePushRef;
  }
  remove(onComplete?) {
    validateArgCount('Firebase.remove', 0, 1, arguments.length);
    validateWritablePath('Firebase.remove', this.path);
    validateCallback('Firebase.remove', 1, onComplete, true);

    return this.set(null, onComplete);
  }
  set(newVal, onComplete?) {
    validateArgCount('Firebase.set', 1, 2, arguments.length);
    validateWritablePath('Firebase.set', this.path);
    validateFirebaseDataArg('Firebase.set', 1, newVal, this.path, false);
    validateCallback('Firebase.set', 2, onComplete, true);

    var deferred = new Deferred();
    this.repo.setWithPriority(this.path, newVal, null, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }
  setPriority(priority, onComplete?) {
    validateArgCount('Firebase.setPriority', 1, 2, arguments.length);
    validateWritablePath('Firebase.setPriority', this.path);
    validatePriority('Firebase.setPriority', 1, priority, false);
    validateCallback('Firebase.setPriority', 2, onComplete, true);

    var deferred = new Deferred();
    this.repo.setWithPriority(this.path.child('.priority'), priority, null, deferred.wrapCallback(onComplete));
    return deferred.promise;
  }
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
  transaction(transactionUpdate, onComplete?, applyLocally?): Promise<TransactionResult> {
    validateArgCount('Firebase.transaction', 1, 3, arguments.length);
    validateWritablePath('Firebase.transaction', this.path);
    validateCallback('Firebase.transaction', 1, transactionUpdate, false);
    validateCallback('Firebase.transaction', 2, onComplete, true);
    // NOTE: opt_applyLocally is an internal-only option for now.  We need to decide if we want to keep it and how
    // to expose it.
    validateBoolean('Firebase.transaction', 3, applyLocally, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys')
      throw 'Firebase.transaction failed: ' + this.getKey() + ' is a read-only object.';

    if (typeof applyLocally === 'undefined')
      applyLocally = true;

    var deferred = new Deferred();
    if (typeof onComplete === 'function') {
      deferred.promise.catch(() => {});
    }

    var promiseComplete = function(error, committed, snapshot) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve({ committed, snapshot });
      }
      if (typeof onComplete === 'function') {
        onComplete(error, committed, snapshot);
      }
    };
    this.repo.startTransaction(this.path, transactionUpdate, promiseComplete, applyLocally);

    return deferred.promise;
  }
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
}
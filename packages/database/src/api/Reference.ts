/**
 * @license
 * Copyright 2017 Google LLC
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

import { OnDisconnect } from './onDisconnect';
import { TransactionResult } from './TransactionResult';
import { warn } from '../core/util/util';
import { nextPushId } from '../core/util/NextPushId';
import { Query } from './Query';
import { Repo } from '../core/Repo';
import { Path } from '../core/util/Path';
import { QueryParams } from '../core/view/QueryParams';
import {
  validateRootPathString,
  validatePathString,
  validateFirebaseMergeDataArg,
  validateBoolean,
  validatePriority,
  validateFirebaseDataArg,
  validateWritablePath
} from '../core/util/validation';
import { validateArgCount, validateCallback, Deferred } from '@firebase/util';

import { SyncPoint } from '../core/SyncPoint';
import { Database } from './Database';
import { DataSnapshot } from './DataSnapshot';
import * as types from '@firebase/database-types';

export interface ReferenceConstructor {
  new (repo: Repo, path: Path): Reference;
}

export class Reference extends Query {
  then: Promise<Reference>['then'];
  catch: Promise<Reference>['catch'];

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
      throw new Error(
        'new Reference() no longer supported - use app.database().'
      );
    }

    // call Query's constructor, passing in the repo and path.
    super(repo, path, QueryParams.DEFAULT, false);
  }

  /** @return {?string} */
  getKey(): string | null {
    validateArgCount('Reference.key', 0, 0, arguments.length);

    if (this.path.isEmpty()) {
      return null;
    } else {
      return this.path.getBack();
    }
  }

  /**
   * @param {!(string|Path)} pathString
   * @return {!Reference}
   */
  child(pathString: string | Path): Reference {
    validateArgCount('Reference.child', 1, 1, arguments.length);
    if (typeof pathString === 'number') {
      pathString = String(pathString);
    } else if (!(pathString instanceof Path)) {
      if (this.path.getFront() === null) {
        validateRootPathString('Reference.child', 1, pathString, false);
      } else {
        validatePathString('Reference.child', 1, pathString, false);
      }
    }

    return new Reference(this.repo, this.path.child(pathString));
  }

  /** @return {?Reference} */
  getParent(): Reference | null {
    validateArgCount('Reference.parent', 0, 0, arguments.length);

    const parentPath = this.path.parent();
    return parentPath === null ? null : new Reference(this.repo, parentPath);
  }

  /** @return {!Reference} */
  getRoot(): Reference {
    validateArgCount('Reference.root', 0, 0, arguments.length);

    let ref: Reference = this;
    while (ref.getParent() !== null) {
      ref = ref.getParent();
    }
    return ref;
  }

  /** @return {!Database} */
  databaseProp(): Database {
    return this.repo.database;
  }

  /**
   * @param {*} newVal
   * @param {function(?Error)=} onComplete
   * @return {!Promise}
   */
  set(
    newVal: unknown,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.set', 1, 2, arguments.length);
    validateWritablePath('Reference.set', this.path);
    validateFirebaseDataArg('Reference.set', 1, newVal, this.path, false);
    validateCallback('Reference.set', 2, onComplete, true);

    const deferred = new Deferred();
    this.repo.setWithPriority(
      this.path,
      newVal,
      /*priority=*/ null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  /**
   * @param {!Object} objectToMerge
   * @param {function(?Error)=} onComplete
   * @return {!Promise}
   */
  update(
    objectToMerge: object,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.update', 1, 2, arguments.length);
    validateWritablePath('Reference.update', this.path);

    if (Array.isArray(objectToMerge)) {
      const newObjectToMerge: { [k: string]: unknown } = {};
      for (let i = 0; i < objectToMerge.length; ++i) {
        newObjectToMerge['' + i] = objectToMerge[i];
      }
      objectToMerge = newObjectToMerge;
      warn(
        'Passing an Array to Firebase.update() is deprecated. ' +
          'Use set() if you want to overwrite the existing data, or ' +
          'an Object with integer keys if you really do want to ' +
          'only update some of the children.'
      );
    }
    validateFirebaseMergeDataArg(
      'Reference.update',
      1,
      objectToMerge,
      this.path,
      false
    );
    validateCallback('Reference.update', 2, onComplete, true);
    const deferred = new Deferred();
    this.repo.update(
      this.path,
      objectToMerge as { [k: string]: unknown },
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  /**
   * @param {*} newVal
   * @param {string|number|null} newPriority
   * @param {function(?Error)=} onComplete
   * @return {!Promise}
   */
  setWithPriority(
    newVal: unknown,
    newPriority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setWithPriority', 2, 3, arguments.length);
    validateWritablePath('Reference.setWithPriority', this.path);
    validateFirebaseDataArg(
      'Reference.setWithPriority',
      1,
      newVal,
      this.path,
      false
    );
    validatePriority('Reference.setWithPriority', 2, newPriority, false);
    validateCallback('Reference.setWithPriority', 3, onComplete, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys') {
      throw (
        'Reference.setWithPriority failed: ' +
        this.getKey() +
        ' is a read-only object.'
      );
    }

    const deferred = new Deferred();
    this.repo.setWithPriority(
      this.path,
      newVal,
      newPriority,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  /**
   * @param {function(?Error)=} onComplete
   * @return {!Promise}
   */
  remove(onComplete?: (a: Error | null) => void): Promise<unknown> {
    validateArgCount('Reference.remove', 0, 1, arguments.length);
    validateWritablePath('Reference.remove', this.path);
    validateCallback('Reference.remove', 1, onComplete, true);

    return this.set(null, onComplete);
  }

  /**
   * @param {function(*):*} transactionUpdate
   * @param {(function(?Error, boolean, ?DataSnapshot))=} onComplete
   * @param {boolean=} applyLocally
   * @return {!Promise}
   */
  transaction(
    transactionUpdate: (a: unknown) => unknown,
    onComplete?: (a: Error | null, b: boolean, c: DataSnapshot | null) => void,
    applyLocally?: boolean
  ): Promise<TransactionResult> {
    validateArgCount('Reference.transaction', 1, 3, arguments.length);
    validateWritablePath('Reference.transaction', this.path);
    validateCallback('Reference.transaction', 1, transactionUpdate, false);
    validateCallback('Reference.transaction', 2, onComplete, true);
    // NOTE: applyLocally is an internal-only option for now.  We need to decide if we want to keep it and how
    // to expose it.
    validateBoolean('Reference.transaction', 3, applyLocally, true);

    if (this.getKey() === '.length' || this.getKey() === '.keys') {
      throw (
        'Reference.transaction failed: ' +
        this.getKey() +
        ' is a read-only object.'
      );
    }

    if (applyLocally === undefined) {
      applyLocally = true;
    }

    const deferred = new Deferred<TransactionResult>();
    if (typeof onComplete === 'function') {
      deferred.promise.catch(() => {});
    }

    const promiseComplete = function (
      error: Error,
      committed: boolean,
      snapshot: DataSnapshot
    ) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(new TransactionResult(committed, snapshot));
      }
      if (typeof onComplete === 'function') {
        onComplete(error, committed, snapshot);
      }
    };
    this.repo.startTransaction(
      this.path,
      transactionUpdate,
      promiseComplete,
      applyLocally
    );

    return deferred.promise;
  }

  /**
   * @param {string|number|null} priority
   * @param {function(?Error)=} onComplete
   * @return {!Promise}
   */
  setPriority(
    priority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setPriority', 1, 2, arguments.length);
    validateWritablePath('Reference.setPriority', this.path);
    validatePriority('Reference.setPriority', 1, priority, false);
    validateCallback('Reference.setPriority', 2, onComplete, true);

    const deferred = new Deferred();
    this.repo.setWithPriority(
      this.path.child('.priority'),
      priority,
      null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  /**
   * @param {*=} value
   * @param {function(?Error)=} onComplete
   * @return {!Reference}
   */
  push(value?: unknown, onComplete?: (a: Error | null) => void): Reference {
    validateArgCount('Reference.push', 0, 2, arguments.length);
    validateWritablePath('Reference.push', this.path);
    validateFirebaseDataArg('Reference.push', 1, value, this.path, true);
    validateCallback('Reference.push', 2, onComplete, true);

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
      promise = thennablePushRef.set(value, onComplete).then(() => pushRef);
    } else {
      promise = Promise.resolve(pushRef);
    }

    thennablePushRef.then = promise.then.bind(promise);
    thennablePushRef.catch = promise.then.bind(promise, undefined);

    if (typeof onComplete === 'function') {
      promise.catch(() => {});
    }

    return thennablePushRef;
  }

  /**
   * @return {!OnDisconnect}
   */
  onDisconnect(): OnDisconnect {
    validateWritablePath('Reference.onDisconnect', this.path);
    return new OnDisconnect(this.repo, this.path);
  }

  get database(): Database {
    return this.databaseProp();
  }

  get key(): string | null {
    return this.getKey();
  }

  get parent(): Reference | null {
    return this.getParent();
  }

  get root(): Reference {
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

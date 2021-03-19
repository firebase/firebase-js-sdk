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

import { Deferred, validateArgCount, validateCallback } from '@firebase/util';

import {
  repoServerTime,
  repoSetWithPriority,
  repoStartTransaction,
  repoUpdate
} from '../core/Repo';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { Node } from '../core/snap/Node';
import { syncPointSetReferenceConstructor } from '../core/SyncPoint';
import { nextPushId } from '../core/util/NextPushId';
import {
  Path,
  pathChild,
  pathGetBack,
  pathGetFront,
  pathIsEmpty,
  pathParent
} from '../core/util/Path';
import { warn } from '../core/util/util';
import {
  validateBoolean,
  validateFirebaseDataArg,
  validateFirebaseMergeDataArg,
  validatePathString,
  validatePriority,
  validateRootPathString,
  validateWritablePath
} from '../core/util/validation';
import { QueryParams } from '../core/view/QueryParams';

import { Database } from './Database';
import { DataSnapshot } from './DataSnapshot';
import { OnDisconnect } from './onDisconnect';
import { Query } from './Query';
import { TransactionResult } from './TransactionResult';

export interface ReferenceConstructor {
  new (database: Database, path: Path): Reference;
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
   */
  constructor(database: Database, path: Path) {
    super(database, path, new QueryParams(), false);
  }

  /** @return {?string} */
  getKey(): string | null {
    validateArgCount('Reference.key', 0, 0, arguments.length);

    if (pathIsEmpty(this.path)) {
      return null;
    } else {
      return pathGetBack(this.path);
    }
  }

  child(pathString: string | Path): Reference {
    validateArgCount('Reference.child', 1, 1, arguments.length);
    if (typeof pathString === 'number') {
      pathString = String(pathString);
    } else if (!(pathString instanceof Path)) {
      if (pathGetFront(this.path) === null) {
        validateRootPathString('Reference.child', 1, pathString, false);
      } else {
        validatePathString('Reference.child', 1, pathString, false);
      }
    }

    return new Reference(this.database, pathChild(this.path, pathString));
  }

  /** @return {?Reference} */
  getParent(): Reference | null {
    validateArgCount('Reference.parent', 0, 0, arguments.length);

    const parentPath = pathParent(this.path);
    return parentPath === null
      ? null
      : new Reference(this.database, parentPath);
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

  set(
    newVal: unknown,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.set', 1, 2, arguments.length);
    validateWritablePath('Reference.set', this.path);
    validateFirebaseDataArg('Reference.set', 1, newVal, this.path, false);
    validateCallback('Reference.set', 2, onComplete, true);

    const deferred = new Deferred();
    repoSetWithPriority(
      this.repo,
      this.path,
      newVal,
      /*priority=*/ null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

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
    repoUpdate(
      this.repo,
      this.path,
      objectToMerge as { [k: string]: unknown },
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

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
    repoSetWithPriority(
      this.repo,
      this.path,
      newVal,
      newPriority,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  remove(onComplete?: (a: Error | null) => void): Promise<unknown> {
    validateArgCount('Reference.remove', 0, 1, arguments.length);
    validateWritablePath('Reference.remove', this.path);
    validateCallback('Reference.remove', 1, onComplete, true);

    return this.set(null, onComplete);
  }

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

    const promiseComplete = (error: Error, committed: boolean, node: Node) => {
      if (error) {
        deferred.reject(error);
        if (typeof onComplete === 'function') {
          onComplete(error, committed, null);
        }
      } else {
        const snapshot = new DataSnapshot(
          node,
          new Reference(this.database, this.path),
          PRIORITY_INDEX
        );
        deferred.resolve(new TransactionResult(committed, snapshot));
        if (typeof onComplete === 'function') {
          onComplete(null, committed, snapshot);
        }
      }
    };

    // Add a watch to make sure we get server updates.
    const valueCallback = function () {};
    const watchRef = new Reference(this.database, this.path);
    watchRef.on('value', valueCallback);
    const unwatcher = function () {
      watchRef.off('value', valueCallback);
    };

    repoStartTransaction(
      this.repo,
      this.path,
      transactionUpdate,
      promiseComplete,
      unwatcher,
      applyLocally
    );

    return deferred.promise;
  }

  setPriority(
    priority: string | number | null,
    onComplete?: (a: Error | null) => void
  ): Promise<unknown> {
    validateArgCount('Reference.setPriority', 1, 2, arguments.length);
    validateWritablePath('Reference.setPriority', this.path);
    validatePriority('Reference.setPriority', 1, priority, false);
    validateCallback('Reference.setPriority', 2, onComplete, true);

    const deferred = new Deferred();
    repoSetWithPriority(
      this.repo,
      pathChild(this.path, '.priority'),
      priority,
      null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  push(value?: unknown, onComplete?: (a: Error | null) => void): Reference {
    validateArgCount('Reference.push', 0, 2, arguments.length);
    validateWritablePath('Reference.push', this.path);
    validateFirebaseDataArg('Reference.push', 1, value, this.path, true);
    validateCallback('Reference.push', 2, onComplete, true);

    const now = repoServerTime(this.repo);
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

  onDisconnect(): OnDisconnect {
    validateWritablePath('Reference.onDisconnect', this.path);
    return new OnDisconnect(this.repo, this.path);
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
syncPointSetReferenceConstructor(Reference);

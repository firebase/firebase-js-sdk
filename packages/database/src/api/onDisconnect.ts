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
  validateWritablePath,
  validateFirebaseDataArg,
  validatePriority,
  validateFirebaseMergeDataArg
} from '../core/util/validation';
import { warn } from '../core/util/util';

import {
  Repo,
  repoOnDisconnectCancel,
  repoOnDisconnectSet,
  repoOnDisconnectSetWithPriority,
  repoOnDisconnectUpdate
} from '../core/Repo';
import { Path } from '../core/util/Path';
import { Indexable } from '../core/util/misc';

export class OnDisconnect {
  constructor(private repo_: Repo, private path_: Path) {}

  cancel(onComplete?: (a: Error | null) => void): Promise<void> {
    validateArgCount('OnDisconnect.cancel', 0, 1, arguments.length);
    validateCallback('OnDisconnect.cancel', 1, onComplete, true);
    const deferred = new Deferred<void>();
    repoOnDisconnectCancel(
      this.repo_,
      this.path_,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  remove(onComplete?: (a: Error | null) => void): Promise<void> {
    validateArgCount('OnDisconnect.remove', 0, 1, arguments.length);
    validateWritablePath('OnDisconnect.remove', this.path_);
    validateCallback('OnDisconnect.remove', 1, onComplete, true);
    const deferred = new Deferred<void>();
    repoOnDisconnectSet(
      this.repo_,
      this.path_,
      null,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  set(value: unknown, onComplete?: (a: Error | null) => void): Promise<void> {
    validateArgCount('OnDisconnect.set', 1, 2, arguments.length);
    validateWritablePath('OnDisconnect.set', this.path_);
    validateFirebaseDataArg('OnDisconnect.set', 1, value, this.path_, false);
    validateCallback('OnDisconnect.set', 2, onComplete, true);
    const deferred = new Deferred<void>();
    repoOnDisconnectSet(
      this.repo_,
      this.path_,
      value,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  setWithPriority(
    value: unknown,
    priority: number | string | null,
    onComplete?: (a: Error | null) => void
  ): Promise<void> {
    validateArgCount('OnDisconnect.setWithPriority', 2, 3, arguments.length);
    validateWritablePath('OnDisconnect.setWithPriority', this.path_);
    validateFirebaseDataArg(
      'OnDisconnect.setWithPriority',
      1,
      value,
      this.path_,
      false
    );
    validatePriority('OnDisconnect.setWithPriority', 2, priority, false);
    validateCallback('OnDisconnect.setWithPriority', 3, onComplete, true);

    const deferred = new Deferred<void>();
    repoOnDisconnectSetWithPriority(
      this.repo_,
      this.path_,
      value,
      priority,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }

  update(
    objectToMerge: Indexable,
    onComplete?: (a: Error | null) => void
  ): Promise<void> {
    validateArgCount('OnDisconnect.update', 1, 2, arguments.length);
    validateWritablePath('OnDisconnect.update', this.path_);
    if (Array.isArray(objectToMerge)) {
      const newObjectToMerge: { [k: string]: unknown } = {};
      for (let i = 0; i < objectToMerge.length; ++i) {
        newObjectToMerge['' + i] = objectToMerge[i];
      }
      objectToMerge = newObjectToMerge;
      warn(
        'Passing an Array to firebase.database.onDisconnect().update() is deprecated. Use set() if you want to overwrite the ' +
          'existing data, or an Object with integer keys if you really do want to only update some of the children.'
      );
    }
    validateFirebaseMergeDataArg(
      'OnDisconnect.update',
      1,
      objectToMerge,
      this.path_,
      false
    );
    validateCallback('OnDisconnect.update', 2, onComplete, true);
    const deferred = new Deferred<void>();
    repoOnDisconnectUpdate(
      this.repo_,
      this.path_,
      objectToMerge,
      deferred.wrapCallback(onComplete)
    );
    return deferred.promise;
  }
}

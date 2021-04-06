/**
 * @license
 * Copyright 2021 Google LLC
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

import { Deferred } from '@firebase/util';

import {
  Repo,
  repoOnDisconnectCancel,
  repoOnDisconnectSet,
  repoOnDisconnectSetWithPriority,
  repoOnDisconnectUpdate
} from '../core/Repo';
import { Indexable } from '../core/util/misc';
import { Path } from '../core/util/Path';
import {
  validateFirebaseDataArg,
  validateFirebaseMergeDataArg,
  validatePriority,
  validateWritablePath
} from '../core/util/validation';

export class OnDisconnect {
  constructor(private _repo: Repo, private _path: Path) {}

  cancel(): Promise<void> {
    const deferred = new Deferred<void>();
    repoOnDisconnectCancel(
      this._repo,
      this._path,
      deferred.wrapCallback(() => {})
    );
    return deferred.promise;
  }

  remove(): Promise<void> {
    validateWritablePath('OnDisconnect.remove', this._path);
    const deferred = new Deferred<void>();
    repoOnDisconnectSet(
      this._repo,
      this._path,
      null,
      deferred.wrapCallback(() => {})
    );
    return deferred.promise;
  }

  set(value: unknown): Promise<void> {
    validateWritablePath('OnDisconnect.set', this._path);
    validateFirebaseDataArg('OnDisconnect.set', value, this._path, false);
    const deferred = new Deferred<void>();
    repoOnDisconnectSet(
      this._repo,
      this._path,
      value,
      deferred.wrapCallback(() => {})
    );
    return deferred.promise;
  }

  setWithPriority(
    value: unknown,
    priority: number | string | null
  ): Promise<void> {
    validateWritablePath('OnDisconnect.setWithPriority', this._path);
    validateFirebaseDataArg(
      'OnDisconnect.setWithPriority',
      value,
      this._path,
      false
    );
    validatePriority('OnDisconnect.setWithPriority', priority, false);

    const deferred = new Deferred<void>();
    repoOnDisconnectSetWithPriority(
      this._repo,
      this._path,
      value,
      priority,
      deferred.wrapCallback(() => {})
    );
    return deferred.promise;
  }

  update(values: Indexable): Promise<void> {
    validateWritablePath('OnDisconnect.update', this._path);
    validateFirebaseMergeDataArg(
      'OnDisconnect.update',
      values,
      this._path,
      false
    );
    const deferred = new Deferred<void>();
    repoOnDisconnectUpdate(
      this._repo,
      this._path,
      values,
      deferred.wrapCallback(() => {})
    );
    return deferred.promise;
  }
}

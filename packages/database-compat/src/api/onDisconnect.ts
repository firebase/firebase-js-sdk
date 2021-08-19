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

import { OnDisconnect as ModularOnDisconnect } from '@firebase/database';
import { validateArgCount, validateCallback, Compat } from '@firebase/util';

import { warn } from '../util/util';
export class OnDisconnect implements Compat<ModularOnDisconnect> {
  constructor(readonly _delegate: ModularOnDisconnect) {}

  cancel(onComplete?: (a: Error | null) => void): Promise<void> {
    validateArgCount('OnDisconnect.cancel', 0, 1, arguments.length);
    validateCallback('OnDisconnect.cancel', 'onComplete', onComplete, true);
    const result = this._delegate.cancel();
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  remove(onComplete?: (a: Error | null) => void): Promise<void> {
    validateArgCount('OnDisconnect.remove', 0, 1, arguments.length);
    validateCallback('OnDisconnect.remove', 'onComplete', onComplete, true);
    const result = this._delegate.remove();
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  set(value: unknown, onComplete?: (a: Error | null) => void): Promise<void> {
    validateArgCount('OnDisconnect.set', 1, 2, arguments.length);
    validateCallback('OnDisconnect.set', 'onComplete', onComplete, true);
    const result = this._delegate.set(value);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  setWithPriority(
    value: unknown,
    priority: number | string | null,
    onComplete?: (a: Error | null) => void
  ): Promise<void> {
    validateArgCount('OnDisconnect.setWithPriority', 2, 3, arguments.length);
    validateCallback(
      'OnDisconnect.setWithPriority',
      'onComplete',
      onComplete,
      true
    );
    const result = this._delegate.setWithPriority(value, priority);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }

  update(
    objectToMerge: Record<string, unknown>,
    onComplete?: (a: Error | null) => void
  ): Promise<void> {
    validateArgCount('OnDisconnect.update', 1, 2, arguments.length);
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
    validateCallback('OnDisconnect.update', 'onComplete', onComplete, true);
    const result = this._delegate.update(objectToMerge);
    if (onComplete) {
      result.then(
        () => onComplete(null),
        error => onComplete(error)
      );
    }
    return result;
  }
}

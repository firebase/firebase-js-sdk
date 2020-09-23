/**
 * @license
 * Copyright 2020 Google LLC
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

import * as exp from '../../exp/index';
import {
  deleteField,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from '../../exp/index';
import * as legacy from '@firebase/firestore-types';
import {
  validateArgType,
  validateAtLeastNumberOfArgs,
  validateExactNumberOfArgs,
  validateNoArgs
} from '../util/input_validation';
import { Compat } from './compat';

export class FieldValue
  extends Compat<exp.FieldValue>
  implements legacy.FieldValue {
  static serverTimestamp(): FieldValue {
    validateNoArgs('FieldValue.serverTimestamp', arguments);
    const delegate = serverTimestamp();
    delegate._methodName = 'FieldValue.serverTimestamp';
    return new FieldValue(delegate);
  }

  static delete(): FieldValue {
    validateNoArgs('FieldValue.delete', arguments);
    const delegate = deleteField();
    delegate._methodName = 'FieldValue.delete';
    return new FieldValue(delegate);
  }

  static arrayUnion(...elements: unknown[]): FieldValue {
    validateAtLeastNumberOfArgs('FieldValue.arrayUnion', arguments, 1);
    const delegate = arrayUnion(...elements);
    delegate._methodName = 'FieldValue.arrayUnion';
    return new FieldValue(delegate);
  }

  static arrayRemove(...elements: unknown[]): FieldValue {
    validateAtLeastNumberOfArgs('FieldValue.arrayRemove', arguments, 1);
    const delegate = arrayRemove(...elements);
    delegate._methodName = 'FieldValue.arrayRemove';
    return new FieldValue(delegate);
  }

  static increment(n: number): FieldValue {
    validateArgType('FieldValue.increment', 'number', 1, n);
    validateExactNumberOfArgs('FieldValue.increment', arguments, 1);
    const delegate = increment(n);
    delegate._methodName = 'FieldValue.increment';
    return new FieldValue(delegate);
  }

  isEqual(other: FieldValue): boolean {
    return this._delegate.isEqual(other._delegate);
  }
}

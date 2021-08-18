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

import {
  arrayRemove,
  arrayUnion,
  deleteField,
  FieldValue as FieldValue1,
  increment,
  serverTimestamp
} from '@firebase/firestore';
import { FieldValue as PublicFieldValue } from '@firebase/firestore-types';
import { Compat } from '@firebase/util';

export class FieldValue implements PublicFieldValue, Compat<FieldValue1> {
  static serverTimestamp(): FieldValue {
    const delegate = serverTimestamp();
    delegate._methodName = 'FieldValue.serverTimestamp';
    return new FieldValue(delegate);
  }

  static delete(): FieldValue {
    const delegate = deleteField();
    delegate._methodName = 'FieldValue.delete';
    return new FieldValue(delegate);
  }

  static arrayUnion(...elements: unknown[]): FieldValue {
    const delegate = arrayUnion(...elements);
    delegate._methodName = 'FieldValue.arrayUnion';
    return new FieldValue(delegate);
  }

  static arrayRemove(...elements: unknown[]): FieldValue {
    const delegate = arrayRemove(...elements);
    delegate._methodName = 'FieldValue.arrayRemove';
    return new FieldValue(delegate);
  }

  static increment(n: number): FieldValue {
    const delegate = increment(n);
    delegate._methodName = 'FieldValue.increment';
    return new FieldValue(delegate);
  }

  constructor(readonly _delegate: FieldValue1) {}

  isEqual(other: FieldValue): boolean {
    return this._delegate.isEqual(other._delegate);
  }
}

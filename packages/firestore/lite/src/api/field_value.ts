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

import { validateAtLeastNumberOfArgs } from '../../../src/util/input_validation';
import {
  ArrayRemoveFieldValueImpl,
  ArrayUnionFieldValueImpl,
  DeleteFieldValueImpl,
  NumericIncrementFieldValueImpl,
  SerializableFieldValue,
  ServerTimestampFieldValueImpl
} from '../../../src/api/field_value';
import { ParseContext } from '../../../src/api/user_data_reader';
import { FieldTransform } from '../../../src/model/mutation';

/** The public FieldValue class of the lite API. */
export abstract class FieldValue extends SerializableFieldValue {}

/**
 * A delegate class that allows the FieldValue implementations returned by
 * deleteField(), serverTimestamp(), arrayUnion(), arrayRemove() and
 * increment() to be an instance of the lite FieldValue class declared above.
 *
 * We don't directly subclass `FieldValue` in the various field value
 * implementations as the base FieldValue class differs between the lite, full
 * and legacy SDK.
 */
class FieldValueDelegate extends FieldValue {
  readonly _methodName: string;

  constructor(readonly _delegate: SerializableFieldValue) {
    super();
    this._methodName = _delegate._methodName;
  }

  _toFieldTransform(context: ParseContext): FieldTransform | null {
    return this._delegate._toFieldTransform(context);
  }

  isEqual(other: FieldValue): boolean {
    if (!(other instanceof FieldValueDelegate)) {
      return false;
    }
    return this._delegate.isEqual(other._delegate);
  }
}

export function deleteField(): FieldValue {
  return new FieldValueDelegate(new DeleteFieldValueImpl('deleteField'));
}

export function serverTimestamp(): FieldValue {
  return new FieldValueDelegate(
    new ServerTimestampFieldValueImpl('serverTimestamp')
  );
}

export function arrayUnion(...elements: unknown[]): FieldValue {
  validateAtLeastNumberOfArgs('arrayUnion()', arguments, 1);
  // NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return new FieldValueDelegate(
    new ArrayUnionFieldValueImpl('arrayUnion', elements)
  );
}

export function arrayRemove(...elements: unknown[]): FieldValue {
  validateAtLeastNumberOfArgs('arrayRemove()', arguments, 1);
  // NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return new FieldValueDelegate(
    new ArrayRemoveFieldValueImpl('arrayRemove', elements)
  );
}

export function increment(n: number): FieldValue {
  return new FieldValueDelegate(
    new NumericIncrementFieldValueImpl('increment', n)
  );
}

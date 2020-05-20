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

import { validateAtLeastNumberOfArgs } from '../../../src/util/input_validation';
import {
  ArrayRemoveFieldValueImpl,
  ArrayUnionFieldValueImpl,
  DeleteFieldValueImpl,
  NumericIncrementFieldValueImpl,
  ServerTimestampFieldValueImpl
} from '../../../src/api/field_value';

// TODO: Must be superclass of FieldValueImpl
export class FieldValue {}

export function deleteField(): DeleteFieldValueImpl {
  return new DeleteFieldValueImpl();
}

export function serverTimestamp(): ServerTimestampFieldValueImpl {
  return new ServerTimestampFieldValueImpl();
}

export function arrayUnion(...elements: unknown[]): ArrayUnionFieldValueImpl {
  validateAtLeastNumberOfArgs('FieldValue.arrayUnion', arguments, 1);
  // NOTE: We don't actually parse the data until it's used in set() or
  // update() since we need access to the Firestore instance.
  return new ArrayUnionFieldValueImpl(elements);
}

export function arrayRemove(...elements: unknown[]): ArrayRemoveFieldValueImpl {
  validateAtLeastNumberOfArgs('FieldValue.arrayRemove', arguments, 1);
  // NOTE: We don't actually parse the data until it's used in set() or
  // update() since we need access to the Firestore instance.
  return new ArrayRemoveFieldValueImpl(elements);
}

export function increment(n: number): NumericIncrementFieldValueImpl {
  return new NumericIncrementFieldValueImpl(n);
}

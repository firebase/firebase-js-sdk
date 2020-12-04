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

import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { isNegativeZero, isSafeInteger } from '../util/types';

/** Base interface for the Serializer implementation. */
export interface Serializer {
  readonly useProto3Json: boolean;
}

/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */
export function toDouble(serializer: Serializer, value: number): ProtoValue {
  if (serializer.useProto3Json) {
    if (isNaN(value)) {
      return { doubleValue: 'NaN' };
    } else if (value === Infinity) {
      return { doubleValue: 'Infinity' };
    } else if (value === -Infinity) {
      return { doubleValue: '-Infinity' };
    }
  }
  return { doubleValue: isNegativeZero(value) ? '-0' : value };
}

/**
 * Returns an IntegerValue for `value`.
 */
export function toInteger(value: number): ProtoValue {
  return { integerValue: '' + value };
}

/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */
export function toNumber(serializer: Serializer, value: number): ProtoValue {
  return isSafeInteger(value) ? toInteger(value) : toDouble(serializer, value);
}

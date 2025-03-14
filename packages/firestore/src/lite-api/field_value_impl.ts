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

import { BsonBinaryData } from './bson_binary_data';
import { BsonObjectId } from './bson_object_Id';
import { BsonTimestamp } from './bson_timestamp_value';
import { FieldValue } from './field_value';
import { Int32Value } from './int32_value';
import { MaxKey } from './max_key';
import { MinKey } from './min_key';
import { RegexValue } from './regex_value';
import {
  ArrayRemoveFieldValueImpl,
  ArrayUnionFieldValueImpl,
  DeleteFieldValueImpl,
  NumericIncrementFieldValueImpl,
  ServerTimestampFieldValueImpl
} from './user_data_reader';
import { VectorValue } from './vector_value';

/**
 * Returns a sentinel for use with {@link @firebase/firestore/lite#(updateDoc:1)} or
 * {@link @firebase/firestore/lite#(setDoc:1)} with `{merge: true}` to mark a field for deletion.
 */
export function deleteField(): FieldValue {
  return new DeleteFieldValueImpl('deleteField');
}

/**
 * Returns a sentinel used with {@link @firebase/firestore/lite#(setDoc:1)} or {@link @firebase/firestore/lite#(updateDoc:1)} to
 * include a server-generated timestamp in the written data.
 */
export function serverTimestamp(): FieldValue {
  return new ServerTimestampFieldValueImpl('serverTimestamp');
}

/**
 * Returns a special value that can be used with {@link @firebase/firestore/lite#(setDoc:1)} or {@link
 * @firebase/firestore/lite#(updateDoc:1)} that tells the server to union the given elements with any array
 * value that already exists on the server. Each specified element that doesn't
 * already exist in the array will be added to the end. If the field being
 * modified is not already an array it will be overwritten with an array
 * containing exactly the specified elements.
 *
 * @param elements - The elements to union into the array.
 * @returns The `FieldValue` sentinel for use in a call to `setDoc()` or
 * `updateDoc()`.
 */
export function arrayUnion(...elements: unknown[]): FieldValue {
  // NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return new ArrayUnionFieldValueImpl('arrayUnion', elements);
}

/**
 * Returns a special value that can be used with {@link (setDoc:1)} or {@link
 * updateDoc:1} that tells the server to remove the given elements from any
 * array value that already exists on the server. All instances of each element
 * specified will be removed from the array. If the field being modified is not
 * already an array it will be overwritten with an empty array.
 *
 * @param elements - The elements to remove from the array.
 * @returns The `FieldValue` sentinel for use in a call to `setDoc()` or
 * `updateDoc()`
 */
export function arrayRemove(...elements: unknown[]): FieldValue {
  // NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return new ArrayRemoveFieldValueImpl('arrayRemove', elements);
}

/**
 * Returns a special value that can be used with {@link @firebase/firestore/lite#(setDoc:1)} or {@link
 * @firebase/firestore/lite#(updateDoc:1)} that tells the server to increment the field's current value by
 * the given value.
 *
 * If either the operand or the current field value uses floating point
 * precision, all arithmetic follows IEEE 754 semantics. If both values are
 * integers, values outside of JavaScript's safe number range
 * (`Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`) are also subject to
 * precision loss. Furthermore, once processed by the Firestore backend, all
 * integer operations are capped between -2^63 and 2^63-1.
 *
 * If the current field value is not of type `number`, or if the field does not
 * yet exist, the transformation sets the field to the given value.
 *
 * @param n - The value to increment by.
 * @returns The `FieldValue` sentinel for use in a call to `setDoc()` or
 * `updateDoc()`
 */
export function increment(n: number): FieldValue {
  return new NumericIncrementFieldValueImpl('increment', n);
}

/**
 * Creates a new `VectorValue` constructed with a copy of the given array of numbers.
 *
 * @param values - Create a `VectorValue` instance with a copy of this array of numbers.
 *
 * @returns A new `VectorValue` constructed with a copy of the given array of numbers.
 */
export function vector(values?: number[]): VectorValue {
  return new VectorValue(values);
}

/**
 * Creates a new `Int32Value` constructed with the given number.
 *
 * @param value - The 32-bit number to be used for constructing the Int32Value
 *
 * @returns A new `Int32Value` constructed with the given number.
 */
export function int32(value: number): Int32Value {
  return new Int32Value(value);
}

/**
 * Creates a new `RegexValue` constructed with the given pattern and options.
 *
 * @param subtype - The subtype of the BSON binary data.
 * @param data - The data to use for the BSON binary data.
 *
 * @returns A new `RegexValue` constructed with the given pattern and options.
 */
export function regex(pattern: string, options: string): RegexValue {
  return new RegexValue(pattern, options);
}

/**
 * Creates a new `BsonBinaryData` constructed with the given subtype and data.
 *
 * @param subtype - Create a `BsonBinaryData` instance with the given subtype.
 * @param data - Create a `BsonBinaryData` instance with a copy of this array of numbers.
 *
 * @returns A new `BsonBinaryData` constructed with the given subtype and data.
 */
export function bsonBinaryData(
  subtype: number,
  data: Uint8Array
): BsonBinaryData {
  return new BsonBinaryData(subtype, data);
}

/**
 * Creates a new `BsonObjectId` constructed with the given string.
 *
 * @param value - The 24-character hex string representing the ObjectId.
 *
 * @returns A new `BsonObjectId` constructed with the given string.
 */
export function bsonObjectId(value: string): BsonObjectId {
  return new BsonObjectId(value);
}

/**
 * Creates a new `BsonTimestamp` constructed with the given seconds and increment.
 *
 * @param seconds - The underlying unsigned 32-bit integer for seconds.
 * @param seconds - The underlying unsigned 32-bit integer for increment.
 *
 * @returns A new `BsonTimestamp` constructed with the given seconds and increment.
 */
export function bsonTimestamp(
  seconds: number,
  increment: number
): BsonTimestamp {
  return new BsonTimestamp(seconds, increment);
}

/**
 * Creates or returns a `MinKey` instance.
 *
 * @returns A `MinKey` instance.
 */
export function minKey(): MinKey {
  return MinKey.instance();
}

/**
 * Creates or returns a `MaxKey` instance.
 *
 * @returns A `MaxKey` instance.
 */
export function maxKey(): MaxKey {
  return MaxKey.instance();
}

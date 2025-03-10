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

/**
 * All the different kinds of values that can be stored in fields in
 * a document. The types of the same comparison order should be defined
 * together as a group. The order of each group is defined by the Firestore
 * backend and is available at:
 *     https://firebase.google.com/docs/firestore/manage-data/data-types
 */
export const enum TypeOrder {
  // This order is based on the backend's ordering, but modified to support
  // server timestamps and `MAX_VALUE` inside the SDK.
  // NULL and MIN_KEY sort the same.
  NullValue = 0,
  MinKeyValue = 0,
  BooleanValue = 1,
  NumberValue = 2,
  TimestampValue = 3,
  // TODO(Mila/BSON): which should come first considering indexes?
  BsonTimestampValue = 4,
  ServerTimestampValue = 5,
  StringValue = 6,
  BlobValue = 7,
  BsonBinaryValue = 8,
  RefValue = 9,
  BsonObjectIdValue = 10,
  GeoPointValue = 11,
  RegexValue = 12,
  ArrayValue = 13,
  VectorValue = 14,
  ObjectValue = 15,
  // TODO(Mila/BSON):should MaxKeyValue and MaxValue combined? how would this affect indexes?
  MaxKeyValue = 16,
  MaxValue = 9007199254740991 // Number.MAX_SAFE_INTEGER
}

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

import { DocumentKey } from '../model/document_key';
import { normalizeByteString, normalizeNumber } from '../model/normalize';
import { isMaxValue } from '../model/values';
import { ArrayValue, MapValue, Value } from '../protos/firestore_proto_api';
import { fail } from '../util/assert';
import { isNegativeZero } from '../util/types';

import { DirectionalIndexByteEncoder } from './directional_index_byte_encoder';

// Note: This code is copied from the backend. Code that is not used by
// Firestore was removed.

const INDEX_TYPE_NULL = 5;
const INDEX_TYPE_BOOLEAN = 10;
const INDEX_TYPE_NAN = 13;
const INDEX_TYPE_NUMBER = 15;
const INDEX_TYPE_TIMESTAMP = 20;
const INDEX_TYPE_STRING = 25;
const INDEX_TYPE_BLOB = 30;
const INDEX_TYPE_REFERENCE = 37;
const INDEX_TYPE_GEOPOINT = 45;
const INDEX_TYPE_ARRAY = 50;
const INDEX_TYPE_MAP = 55;
const INDEX_TYPE_REFERENCE_SEGMENT = 60;

// A terminator that indicates that a truncatable value was not truncated.
// This must be smaller than all other type labels.
const NOT_TRUNCATED = 2;

/** Firestore index value writer.  */
export class FirestoreIndexValueWriter {
  static INSTANCE = new FirestoreIndexValueWriter();

  private constructor() {}

  // The write methods below short-circuit writing terminators for values
  // containing a (terminating) truncated value.
  //
  // As an example, consider the resulting encoding for:
  //
  // ["bar", [2, "foo"]] -> (STRING, "bar", TERM, ARRAY, NUMBER, 2, STRING, "foo", TERM, TERM, TERM)
  // ["bar", [2, truncated("foo")]] -> (STRING, "bar", TERM, ARRAY, NUMBER, 2, STRING, "foo", TRUNC)
  // ["bar", truncated(["foo"])] -> (STRING, "bar", TERM, ARRAY. STRING, "foo", TERM, TRUNC)

  /** Writes an index value.  */
  writeIndexValue(value: Value, encoder: DirectionalIndexByteEncoder): void {
    this.writeIndexValueAux(value, encoder);
    // Write separator to split index values
    // (see go/firestore-storage-format#encodings).
    encoder.writeInfinity();
  }

  private writeIndexValueAux(
    indexValue: Value,
    encoder: DirectionalIndexByteEncoder
  ): void {
    if ('nullValue' in indexValue) {
      this.writeValueTypeLabel(encoder, INDEX_TYPE_NULL);
    } else if ('booleanValue' in indexValue) {
      this.writeValueTypeLabel(encoder, INDEX_TYPE_BOOLEAN);
      encoder.writeNumber(indexValue.booleanValue ? 1 : 0);
    } else if ('integerValue' in indexValue) {
      this.writeValueTypeLabel(encoder, INDEX_TYPE_NUMBER);
      encoder.writeNumber(normalizeNumber(indexValue.integerValue));
    } else if ('doubleValue' in indexValue) {
      const n = normalizeNumber(indexValue.doubleValue);
      if (isNaN(n)) {
        this.writeValueTypeLabel(encoder, INDEX_TYPE_NAN);
      } else {
        this.writeValueTypeLabel(encoder, INDEX_TYPE_NUMBER);
        if (isNegativeZero(n)) {
          // -0.0, 0 and 0.0 are all considered the same
          encoder.writeNumber(0.0);
        } else {
          encoder.writeNumber(n);
        }
      }
    } else if ('timestampValue' in indexValue) {
      const timestamp = indexValue.timestampValue!;
      this.writeValueTypeLabel(encoder, INDEX_TYPE_TIMESTAMP);
      if (typeof timestamp === 'string') {
        encoder.writeString(timestamp);
      } else {
        encoder.writeString(`${timestamp.seconds || ''}`);
        encoder.writeNumber(timestamp.nanos || 0);
      }
    } else if ('stringValue' in indexValue) {
      this.writeIndexString(indexValue.stringValue!, encoder);
      this.writeTruncationMarker(encoder);
    } else if ('bytesValue' in indexValue) {
      this.writeValueTypeLabel(encoder, INDEX_TYPE_BLOB);
      encoder.writeBytes(normalizeByteString(indexValue.bytesValue!));
      this.writeTruncationMarker(encoder);
    } else if ('referenceValue' in indexValue) {
      this.writeIndexEntityRef(indexValue.referenceValue!, encoder);
    } else if ('geoPointValue' in indexValue) {
      const geoPoint = indexValue.geoPointValue!;
      this.writeValueTypeLabel(encoder, INDEX_TYPE_GEOPOINT);
      encoder.writeNumber(geoPoint.latitude || 0);
      encoder.writeNumber(geoPoint.longitude || 0);
    } else if ('mapValue' in indexValue) {
      if (isMaxValue(indexValue)) {
        this.writeValueTypeLabel(encoder, Number.MAX_SAFE_INTEGER);
      } else {
        this.writeIndexMap(indexValue.mapValue!, encoder);
        this.writeTruncationMarker(encoder);
      }
    } else if ('arrayValue' in indexValue) {
      this.writeIndexArray(indexValue.arrayValue!, encoder);
      this.writeTruncationMarker(encoder);
    } else {
      fail('unknown index value type ' + indexValue);
    }
  }

  private writeIndexString(
    stringIndexValue: string,
    encoder: DirectionalIndexByteEncoder
  ): void {
    this.writeValueTypeLabel(encoder, INDEX_TYPE_STRING);
    this.writeUnlabeledIndexString(stringIndexValue, encoder);
  }

  private writeUnlabeledIndexString(
    stringIndexValue: string,
    encoder: DirectionalIndexByteEncoder
  ): void {
    encoder.writeString(stringIndexValue);
  }

  private writeIndexMap(
    mapIndexValue: MapValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    const map = mapIndexValue.fields || {};
    this.writeValueTypeLabel(encoder, INDEX_TYPE_MAP);
    for (const key of Object.keys(map)) {
      this.writeIndexString(key, encoder);
      this.writeIndexValueAux(map[key], encoder);
    }
  }

  private writeIndexArray(
    arrayIndexValue: ArrayValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    const values = arrayIndexValue.values || [];
    this.writeValueTypeLabel(encoder, INDEX_TYPE_ARRAY);
    for (const element of values) {
      this.writeIndexValueAux(element, encoder);
    }
  }

  private writeIndexEntityRef(
    referenceValue: string,
    encoder: DirectionalIndexByteEncoder
  ): void {
    this.writeValueTypeLabel(encoder, INDEX_TYPE_REFERENCE);
    const path = DocumentKey.fromName(referenceValue).path;
    path.forEach(segment => {
      this.writeValueTypeLabel(encoder, INDEX_TYPE_REFERENCE_SEGMENT);
      this.writeUnlabeledIndexString(segment, encoder);
    });
  }

  private writeValueTypeLabel(
    encoder: DirectionalIndexByteEncoder,
    typeOrder: number
  ): void {
    encoder.writeNumber(typeOrder);
  }

  private writeTruncationMarker(encoder: DirectionalIndexByteEncoder): void {
    // While the SDK does not implement truncation, the truncation marker is
    // used to terminate all variable length values (which are strings, bytes,
    // references, arrays and maps).
    encoder.writeNumber(NOT_TRUNCATED);
  }
}

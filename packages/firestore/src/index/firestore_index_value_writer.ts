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
import {
  normalizeByteString,
  normalizeNumber,
  normalizeTimestamp
} from '../model/normalize';
import {
  VECTOR_MAP_VECTORS_KEY,
  detectMapRepresentation,
  RESERVED_BSON_TIMESTAMP_KEY,
  RESERVED_REGEX_KEY,
  RESERVED_BSON_OBJECT_ID_KEY,
  RESERVED_BSON_BINARY_KEY,
  MapRepresentation,
  RESERVED_REGEX_PATTERN_KEY,
  RESERVED_REGEX_OPTIONS_KEY,
  RESERVED_INT32_KEY
} from '../model/values';
import { ArrayValue, MapValue, Value } from '../protos/firestore_proto_api';
import { fail } from '../util/assert';
import { isNegativeZero } from '../util/types';

import { DirectionalIndexByteEncoder } from './directional_index_byte_encoder';

// Note: This file is copied from the backend. Code that is not used by
// Firestore was removed. Code that has different behavior was modified.

// The client SDK only supports references to documents from the same database. We can skip the
// first five segments.
const DOCUMENT_NAME_OFFSET = 5;

const INDEX_TYPE_NULL = 5;
const INDEX_TYPE_MIN_KEY = 7;
const INDEX_TYPE_BOOLEAN = 10;
const INDEX_TYPE_NAN = 13;
const INDEX_TYPE_NUMBER = 15;
const INDEX_TYPE_TIMESTAMP = 20;
const INDEX_TYPE_BSON_TIMESTAMP = 22;
const INDEX_TYPE_STRING = 25;
const INDEX_TYPE_BLOB = 30;
const INDEX_TYPE_BSON_BINARY = 31;
const INDEX_TYPE_REFERENCE = 37;
const INDEX_TYPE_BSON_OBJECT_ID = 43;
const INDEX_TYPE_GEOPOINT = 45;
const INDEX_TYPE_REGEX = 47;
const INDEX_TYPE_ARRAY = 50;
const INDEX_TYPE_VECTOR = 53;
const INDEX_TYPE_MAP = 55;
const INDEX_TYPE_REFERENCE_SEGMENT = 60;
const INDEX_TYPE_MAX_KEY = 999;

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
      let timestamp = indexValue.timestampValue!;
      this.writeValueTypeLabel(encoder, INDEX_TYPE_TIMESTAMP);
      if (typeof timestamp === 'string') {
        timestamp = normalizeTimestamp(timestamp);
      }
      encoder.writeString(`${timestamp.seconds || ''}`);
      encoder.writeNumber(timestamp.nanos || 0);
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
      const type = detectMapRepresentation(indexValue);
      if (type === MapRepresentation.INTERNAL_MAX) {
        this.writeValueTypeLabel(encoder, Number.MAX_SAFE_INTEGER);
      } else if (type === MapRepresentation.VECTOR) {
        this.writeIndexVector(indexValue.mapValue!, encoder);
      } else if (type === MapRepresentation.MAX_KEY) {
        this.writeValueTypeLabel(encoder, INDEX_TYPE_MAX_KEY);
      } else if (type === MapRepresentation.MIN_KEY) {
        this.writeValueTypeLabel(encoder, INDEX_TYPE_MIN_KEY);
      } else if (type === MapRepresentation.BSON_BINARY) {
        this.writeIndexBsonBinaryData(indexValue.mapValue!, encoder);
      } else if (type === MapRepresentation.REGEX) {
        this.writeIndexRegex(indexValue.mapValue!, encoder);
      } else if (type === MapRepresentation.BSON_TIMESTAMP) {
        this.writeIndexBsonTimestamp(indexValue.mapValue!, encoder);
      } else if (type === MapRepresentation.BSON_OBJECT_ID) {
        this.writeIndexBsonObjectId(indexValue.mapValue!, encoder);
      } else if (type === MapRepresentation.INT32) {
        this.writeValueTypeLabel(encoder, INDEX_TYPE_NUMBER);
        encoder.writeNumber(
          normalizeNumber(
            indexValue.mapValue!.fields![RESERVED_INT32_KEY]!.integerValue!
          )
        );
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

  private writeIndexVector(
    mapIndexValue: MapValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    const map = mapIndexValue.fields || {};
    this.writeValueTypeLabel(encoder, INDEX_TYPE_VECTOR);

    // Vectors sort first by length
    const key = VECTOR_MAP_VECTORS_KEY;
    const length = map[key].arrayValue?.values?.length || 0;
    this.writeValueTypeLabel(encoder, INDEX_TYPE_NUMBER);
    encoder.writeNumber(normalizeNumber(length));

    // Vectors then sort by position value
    this.writeIndexString(key, encoder);
    this.writeIndexValueAux(map[key], encoder);
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
    const segments: string[] = referenceValue
      .split('/')
      .filter(segment => segment.length > 0);
    const path = DocumentKey.fromSegments(
      segments.slice(DOCUMENT_NAME_OFFSET)
    ).path;
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

  private writeIndexBsonTimestamp(
    mapValue: MapValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    this.writeValueTypeLabel(encoder, INDEX_TYPE_BSON_TIMESTAMP);
    const fields = mapValue.fields || {};
    if (fields) {
      // The JS SDK encodes BSON timestamps differently than the backend.
      // This is due to the limitation of `number` in JS which handles up to 53-bit precision.
      this.writeIndexMap(
        fields[RESERVED_BSON_TIMESTAMP_KEY].mapValue!,
        encoder
      );
    }
  }

  private writeIndexBsonObjectId(
    mapValue: MapValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    this.writeValueTypeLabel(encoder, INDEX_TYPE_BSON_OBJECT_ID);
    const fields = mapValue.fields || {};
    const oid = fields[RESERVED_BSON_OBJECT_ID_KEY]?.stringValue || '';
    encoder.writeBytes(normalizeByteString(oid));
  }

  private writeIndexBsonBinaryData(
    mapValue: MapValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    this.writeValueTypeLabel(encoder, INDEX_TYPE_BSON_BINARY);
    const fields = mapValue.fields || {};
    const binary = fields[RESERVED_BSON_BINARY_KEY]?.bytesValue || '';
    encoder.writeBytes(normalizeByteString(binary));
    this.writeTruncationMarker(encoder);
  }

  private writeIndexRegex(
    mapValue: MapValue,
    encoder: DirectionalIndexByteEncoder
  ): void {
    this.writeValueTypeLabel(encoder, INDEX_TYPE_REGEX);
    const fields = mapValue.fields || {};
    const regex = fields[RESERVED_REGEX_KEY]?.mapValue?.fields || {};
    if (regex) {
      encoder.writeString(regex[RESERVED_REGEX_PATTERN_KEY]?.stringValue || '');
      encoder.writeString(regex[RESERVED_REGEX_OPTIONS_KEY]?.stringValue || '');
    }
    this.writeTruncationMarker(encoder);
  }
}

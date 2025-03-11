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

import { DatabaseId } from '../core/database_info';
import {
  ArrayValue,
  LatLng,
  MapValue,
  Timestamp,
  Value
} from '../protos/firestore_proto_api';
import { fail } from '../util/assert';
import { arrayEquals, primitiveComparator } from '../util/misc';
import { forEach, objectSize } from '../util/obj';
import { isNegativeZero } from '../util/types';

import { DocumentKey } from './document_key';
import {
  normalizeByteString,
  normalizeNumber,
  normalizeTimestamp
} from './normalize';
import { getLocalWriteTime, getPreviousValue } from './server_timestamps';
import { TypeOrder } from './type_order';

export const TYPE_KEY = '__type__';

export const RESERVED_VECTOR_KEY = '__vector__';
export const VECTOR_MAP_VECTORS_KEY = 'value';

const RESERVED_SERVER_TIMESTAMP_KEY = 'server_timestamp';

export const RESERVED_MIN_KEY = '__min__';
export const RESERVED_MAX_KEY = '__max__';

export const RESERVED_REGEX_KEY = '__regex__';
export const RESERVED_REGEX_PATTERN_KEY = 'pattern';
export const RESERVED_REGEX_OPTIONS_KEY = 'options';

export const RESERVED_BSON_OBJECT_ID_KEY = '__oid__';

export const RESERVED_INT32_KEY = '__int__';

export const RESERVED_BSON_TIMESTAMP_KEY = '__request_timestamp__';
export const RESERVED_BSON_TIMESTAMP_SECONDS_KEY = 'seconds';
export const RESERVED_BSON_TIMESTAMP_INCREMENT_KEY = 'increment';

export const RESERVED_BSON_BINARY_KEY = '__binary__';

export const INTERNAL_MIN_VALUE: Value = {
  nullValue: 'NULL_VALUE'
};

export const INTERNAL_MAX_VALUE: Value = {
  mapValue: {
    fields: {
      '__type__': { stringValue: RESERVED_MAX_KEY }
    }
  }
};

export const MIN_VECTOR_VALUE: Value = {
  mapValue: {
    fields: {
      [TYPE_KEY]: { stringValue: RESERVED_VECTOR_KEY },
      [VECTOR_MAP_VECTORS_KEY]: {
        arrayValue: {}
      }
    }
  }
};

export const MIN_KEY_VALUE: Value = {
  mapValue: {
    fields: {
      [RESERVED_MIN_KEY]: {
        nullValue: 'NULL_VALUE'
      }
    }
  }
};

export const MAX_KEY_VALUE: Value = {
  mapValue: {
    fields: {
      [RESERVED_MAX_KEY]: {
        nullValue: 'NULL_VALUE'
      }
    }
  }
};

export const MIN_BSON_OBJECT_ID_VALUE: Value = {
  mapValue: {
    fields: {
      [RESERVED_BSON_OBJECT_ID_KEY]: {
        stringValue: ''
      }
    }
  }
};

export const MIN_BSON_TIMESTAMP_VALUE: Value = {
  mapValue: {
    fields: {
      [RESERVED_BSON_TIMESTAMP_KEY]: {
        mapValue: {
          fields: {
            // Both seconds and increment are 32 bit unsigned integers
            [RESERVED_BSON_TIMESTAMP_SECONDS_KEY]: {
              integerValue: 0
            },
            [RESERVED_BSON_TIMESTAMP_INCREMENT_KEY]: {
              integerValue: 0
            }
          }
        }
      }
    }
  }
};

export const MIN_REGEX_VALUE: Value = {
  mapValue: {
    fields: {
      [RESERVED_REGEX_KEY]: {
        mapValue: {
          fields: {
            [RESERVED_REGEX_PATTERN_KEY]: { stringValue: '' },
            [RESERVED_REGEX_OPTIONS_KEY]: { stringValue: '' }
          }
        }
      }
    }
  }
};

export const MIN_BSON_BINARY_VALUE: Value = {
  mapValue: {
    fields: {
      [RESERVED_BSON_BINARY_KEY]: {
        // bsonBinaryValue should have at least one byte as subtype
        bytesValue: Uint8Array.from([0])
      }
    }
  }
};

export enum SpecialMapValueType {
  REGEX = 'regexValue',
  BSON_OBJECT_ID = 'bsonObjectIdValue',
  INT32 = 'int32Value',
  BSON_TIMESTAMP = 'bsonTimestampValue',
  BSON_BINARY = 'bsonBinaryValue',
  MIN_KEY = 'minKeyValue',
  MAX_KEY = 'maxKeyValue',
  INTERNAL_MAX = 'maxValue',
  VECTOR = 'vectorValue',
  SERVER_TIMESTAMP = 'serverTimestampValue',
  REGULAR_MAP = 'regularMapValue'
}

/** Extracts the backend's type order for the provided value. */
export function typeOrder(value: Value): TypeOrder {
  if ('nullValue' in value) {
    return TypeOrder.NullValue;
  } else if ('booleanValue' in value) {
    return TypeOrder.BooleanValue;
  } else if ('integerValue' in value || 'doubleValue' in value) {
    return TypeOrder.NumberValue;
  } else if ('timestampValue' in value) {
    return TypeOrder.TimestampValue;
  } else if ('stringValue' in value) {
    return TypeOrder.StringValue;
  } else if ('bytesValue' in value) {
    return TypeOrder.BlobValue;
  } else if ('referenceValue' in value) {
    return TypeOrder.RefValue;
  } else if ('geoPointValue' in value) {
    return TypeOrder.GeoPointValue;
  } else if ('arrayValue' in value) {
    return TypeOrder.ArrayValue;
  } else if ('mapValue' in value) {
    const valueType = detectSpecialMapType(value);
    switch (valueType) {
      case SpecialMapValueType.SERVER_TIMESTAMP:
        return TypeOrder.ServerTimestampValue;
      case SpecialMapValueType.INTERNAL_MAX:
        return TypeOrder.MaxValue;
      case SpecialMapValueType.VECTOR:
        return TypeOrder.VectorValue;
      case SpecialMapValueType.REGEX:
        return TypeOrder.RegexValue;
      case SpecialMapValueType.BSON_OBJECT_ID:
        return TypeOrder.BsonObjectIdValue;
      case SpecialMapValueType.INT32:
        return TypeOrder.NumberValue;
      case SpecialMapValueType.BSON_TIMESTAMP:
        return TypeOrder.BsonTimestampValue;
      case SpecialMapValueType.BSON_BINARY:
        return TypeOrder.BsonBinaryValue;
      case SpecialMapValueType.MIN_KEY:
        return TypeOrder.MinKeyValue;
      case SpecialMapValueType.MAX_KEY:
        return TypeOrder.MaxKeyValue;
      default:
        return TypeOrder.ObjectValue;
    }
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

/** Tests `left` and `right` for equality based on the backend semantics. */
export function valueEquals(left: Value, right: Value): boolean {
  if (left === right) {
    return true;
  }

  const leftType = typeOrder(left);
  const rightType = typeOrder(right);
  if (leftType !== rightType) {
    return false;
  }

  switch (leftType) {
    case TypeOrder.NullValue:
    case TypeOrder.MaxValue:
    // MaxKeys are all equal.
    case TypeOrder.MaxKeyValue:
    // MinKeys are all equal.
    case TypeOrder.MinKeyValue:
      return true;
    case TypeOrder.BooleanValue:
      return left.booleanValue === right.booleanValue;
    case TypeOrder.ServerTimestampValue:
      return getLocalWriteTime(left).isEqual(getLocalWriteTime(right));
    case TypeOrder.TimestampValue:
      return timestampEquals(left, right);
    case TypeOrder.StringValue:
      return left.stringValue === right.stringValue;
    case TypeOrder.BlobValue:
      return blobEquals(left, right);
    case TypeOrder.RefValue:
      return left.referenceValue === right.referenceValue;
    case TypeOrder.GeoPointValue:
      return geoPointEquals(left, right);
    case TypeOrder.NumberValue:
      return numberEquals(left, right);
    case TypeOrder.ArrayValue:
      return arrayEquals(
        left.arrayValue!.values || [],
        right.arrayValue!.values || [],
        valueEquals
      );
    case TypeOrder.VectorValue:
    case TypeOrder.ObjectValue:
      return objectEquals(left, right);
    case TypeOrder.BsonBinaryValue:
      return compareBsonBinaryData(left, right) === 0;
    case TypeOrder.BsonTimestampValue:
      return compareBsonTimestamps(left, right) === 0;
    case TypeOrder.RegexValue:
      return compareRegex(left, right) === 0;
    case TypeOrder.BsonObjectIdValue:
      return compareBsonObjectIds(left, right) === 0;
    default:
      return fail('Unexpected value type: ' + JSON.stringify(left));
  }
}

function timestampEquals(left: Value, right: Value): boolean {
  if (
    typeof left.timestampValue === 'string' &&
    typeof right.timestampValue === 'string' &&
    left.timestampValue.length === right.timestampValue.length
  ) {
    // Use string equality for ISO 8601 timestamps
    return left.timestampValue === right.timestampValue;
  }

  const leftTimestamp = normalizeTimestamp(left.timestampValue!);
  const rightTimestamp = normalizeTimestamp(right.timestampValue!);
  return (
    leftTimestamp.seconds === rightTimestamp.seconds &&
    leftTimestamp.nanos === rightTimestamp.nanos
  );
}

function geoPointEquals(left: Value, right: Value): boolean {
  return (
    normalizeNumber(left.geoPointValue!.latitude) ===
      normalizeNumber(right.geoPointValue!.latitude) &&
    normalizeNumber(left.geoPointValue!.longitude) ===
      normalizeNumber(right.geoPointValue!.longitude)
  );
}

function blobEquals(left: Value, right: Value): boolean {
  return normalizeByteString(left.bytesValue!).isEqual(
    normalizeByteString(right.bytesValue!)
  );
}

export function numberEquals(left: Value, right: Value): boolean {
  if (
    ('integerValue' in left && 'integerValue' in right) ||
    (detectSpecialMapType(left) === SpecialMapValueType.INT32 &&
      detectSpecialMapType(right) === SpecialMapValueType.INT32)
  ) {
    return extractNumber(left) === extractNumber(right);
  } else if ('doubleValue' in left && 'doubleValue' in right) {
    const n1 = normalizeNumber(left.doubleValue!);
    const n2 = normalizeNumber(right.doubleValue!);

    if (n1 === n2) {
      return isNegativeZero(n1) === isNegativeZero(n2);
    } else {
      return isNaN(n1) && isNaN(n2);
    }
  }

  return false;
}

function objectEquals(left: Value, right: Value): boolean {
  const leftMap = left.mapValue!.fields || {};
  const rightMap = right.mapValue!.fields || {};

  if (objectSize(leftMap) !== objectSize(rightMap)) {
    return false;
  }

  for (const key in leftMap) {
    if (leftMap.hasOwnProperty(key)) {
      if (
        rightMap[key] === undefined ||
        !valueEquals(leftMap[key], rightMap[key])
      ) {
        return false;
      }
    }
  }
  return true;
}

/** Returns true if the ArrayValue contains the specified element. */
export function arrayValueContains(
  haystack: ArrayValue,
  needle: Value
): boolean {
  return (
    (haystack.values || []).find(v => valueEquals(v, needle)) !== undefined
  );
}

export function valueCompare(left: Value, right: Value): number {
  if (left === right) {
    return 0;
  }

  const leftType = typeOrder(left);
  const rightType = typeOrder(right);

  if (leftType !== rightType) {
    return primitiveComparator(leftType, rightType);
  }

  switch (leftType) {
    case TypeOrder.NullValue:
    case TypeOrder.MinKeyValue:
    case TypeOrder.MaxKeyValue:
    case TypeOrder.MaxValue:
      return 0;
    case TypeOrder.BooleanValue:
      return primitiveComparator(left.booleanValue!, right.booleanValue!);
    case TypeOrder.NumberValue:
      return compareNumbers(left, right);
    case TypeOrder.TimestampValue:
      return compareTimestamps(left.timestampValue!, right.timestampValue!);
    case TypeOrder.ServerTimestampValue:
      return compareTimestamps(
        getLocalWriteTime(left),
        getLocalWriteTime(right)
      );
    case TypeOrder.StringValue:
      return primitiveComparator(left.stringValue!, right.stringValue!);
    case TypeOrder.BlobValue:
      return compareBlobs(left.bytesValue!, right.bytesValue!);
    case TypeOrder.RefValue:
      return compareReferences(left.referenceValue!, right.referenceValue!);
    case TypeOrder.GeoPointValue:
      return compareGeoPoints(left.geoPointValue!, right.geoPointValue!);
    case TypeOrder.ArrayValue:
      return compareArrays(left.arrayValue!, right.arrayValue!);
    case TypeOrder.VectorValue:
      return compareVectors(left.mapValue!, right.mapValue!);
    case TypeOrder.ObjectValue:
      return compareMaps(left.mapValue!, right.mapValue!);
    case TypeOrder.BsonTimestampValue:
      return compareBsonTimestamps(left, right);
    case TypeOrder.BsonBinaryValue:
      return compareBsonBinaryData(left, right);
    case TypeOrder.RegexValue:
      return compareRegex(left, right);
    case TypeOrder.BsonObjectIdValue:
      return compareBsonObjectIds(left, right);

    default:
      throw fail('Invalid value type: ' + leftType);
  }
}

export function extractNumber(value: Value): number {
  let numberValue;
  if (detectSpecialMapType(value) === SpecialMapValueType.INT32) {
    numberValue = value.mapValue!.fields![RESERVED_INT32_KEY].integerValue!;
  } else {
    numberValue = value.integerValue || value.doubleValue;
  }
  return normalizeNumber(numberValue);
}

function compareNumbers(left: Value, right: Value): number {
  const leftNumber = extractNumber(left);
  const rightNumber = extractNumber(right);

  if (leftNumber < rightNumber) {
    return -1;
  } else if (leftNumber > rightNumber) {
    return 1;
  } else if (leftNumber === rightNumber) {
    return 0;
  } else {
    // one or both are NaN.
    if (isNaN(leftNumber)) {
      return isNaN(rightNumber) ? 0 : -1;
    } else {
      return 1;
    }
  }
}

function compareTimestamps(left: Timestamp, right: Timestamp): number {
  if (
    typeof left === 'string' &&
    typeof right === 'string' &&
    left.length === right.length
  ) {
    return primitiveComparator(left, right);
  }

  const leftTimestamp = normalizeTimestamp(left);
  const rightTimestamp = normalizeTimestamp(right);

  const comparison = primitiveComparator(
    leftTimestamp.seconds,
    rightTimestamp.seconds
  );
  if (comparison !== 0) {
    return comparison;
  }
  return primitiveComparator(leftTimestamp.nanos, rightTimestamp.nanos);
}

function compareReferences(leftPath: string, rightPath: string): number {
  const leftSegments = leftPath.split('/');
  const rightSegments = rightPath.split('/');
  for (let i = 0; i < leftSegments.length && i < rightSegments.length; i++) {
    const comparison = primitiveComparator(leftSegments[i], rightSegments[i]);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return primitiveComparator(leftSegments.length, rightSegments.length);
}

function compareGeoPoints(left: LatLng, right: LatLng): number {
  const comparison = primitiveComparator(
    normalizeNumber(left.latitude),
    normalizeNumber(right.latitude)
  );
  if (comparison !== 0) {
    return comparison;
  }
  return primitiveComparator(
    normalizeNumber(left.longitude),
    normalizeNumber(right.longitude)
  );
}

function compareBlobs(
  left: string | Uint8Array,
  right: string | Uint8Array
): number {
  const leftBytes = normalizeByteString(left);
  const rightBytes = normalizeByteString(right);
  return leftBytes.compareTo(rightBytes);
}

function compareArrays(left: ArrayValue, right: ArrayValue): number {
  const leftArray = left.values || [];
  const rightArray = right.values || [];

  for (let i = 0; i < leftArray.length && i < rightArray.length; ++i) {
    const compare = valueCompare(leftArray[i], rightArray[i]);
    if (compare) {
      return compare;
    }
  }
  return primitiveComparator(leftArray.length, rightArray.length);
}

function compareVectors(left: MapValue, right: MapValue): number {
  const leftMap = left.fields || {};
  const rightMap = right.fields || {};

  // The vector is a map, but only vector value is compared.
  const leftArrayValue = leftMap[VECTOR_MAP_VECTORS_KEY]?.arrayValue;
  const rightArrayValue = rightMap[VECTOR_MAP_VECTORS_KEY]?.arrayValue;

  const lengthCompare = primitiveComparator(
    leftArrayValue?.values?.length || 0,
    rightArrayValue?.values?.length || 0
  );
  if (lengthCompare !== 0) {
    return lengthCompare;
  }

  return compareArrays(leftArrayValue!, rightArrayValue!);
}

function compareMaps(left: MapValue, right: MapValue): number {
  if (
    left === INTERNAL_MAX_VALUE.mapValue &&
    right === INTERNAL_MAX_VALUE.mapValue
  ) {
    return 0;
  } else if (left === INTERNAL_MAX_VALUE.mapValue) {
    return 1;
  } else if (right === INTERNAL_MAX_VALUE.mapValue) {
    return -1;
  }

  const leftMap = left.fields || {};
  const leftKeys = Object.keys(leftMap);
  const rightMap = right.fields || {};
  const rightKeys = Object.keys(rightMap);

  // Even though MapValues are likely sorted correctly based on their insertion
  // order (e.g. when received from the backend), local modifications can bring
  // elements out of order. We need to re-sort the elements to ensure that
  // canonical IDs are independent of insertion order.
  leftKeys.sort();
  rightKeys.sort();

  for (let i = 0; i < leftKeys.length && i < rightKeys.length; ++i) {
    const keyCompare = primitiveComparator(leftKeys[i], rightKeys[i]);
    if (keyCompare !== 0) {
      return keyCompare;
    }
    const compare = valueCompare(leftMap[leftKeys[i]], rightMap[rightKeys[i]]);
    if (compare !== 0) {
      return compare;
    }
  }

  return primitiveComparator(leftKeys.length, rightKeys.length);
}

function compareBsonTimestamps(left: Value, right: Value): number {
  const leftSecondField =
    left.mapValue!.fields?.[RESERVED_BSON_TIMESTAMP_KEY].mapValue?.fields?.[
      RESERVED_BSON_TIMESTAMP_SECONDS_KEY
    ];
  const rightSecondField =
    right.mapValue!.fields?.[RESERVED_BSON_TIMESTAMP_KEY].mapValue?.fields?.[
      RESERVED_BSON_TIMESTAMP_SECONDS_KEY
    ];

  const leftIncrementField =
    left.mapValue!.fields?.[RESERVED_BSON_TIMESTAMP_KEY].mapValue?.fields?.[
      RESERVED_BSON_TIMESTAMP_INCREMENT_KEY
    ];
  const rightIncrementField =
    right.mapValue!.fields?.[RESERVED_BSON_TIMESTAMP_KEY].mapValue?.fields?.[
      RESERVED_BSON_TIMESTAMP_INCREMENT_KEY
    ];

  const secondsDiff = compareNumbers(leftSecondField!, rightSecondField!);
  return secondsDiff !== 0
    ? secondsDiff
    : compareNumbers(leftIncrementField!, rightIncrementField!);
}

function compareBsonBinaryData(left: Value, right: Value): number {
  const leftBytes =
    left.mapValue!.fields?.[RESERVED_BSON_BINARY_KEY]?.bytesValue;
  const rightBytes =
    right.mapValue!.fields?.[RESERVED_BSON_BINARY_KEY]?.bytesValue;
  if (!rightBytes || !leftBytes) {
    throw new Error('Received incorrect bytesValue for BsonBinaryData');
  }
  return compareBlobs(leftBytes, rightBytes);
}

function compareRegex(left: Value, right: Value): number {
  const leftFields = left.mapValue!.fields;
  const leftPattern =
    leftFields?.[RESERVED_REGEX_KEY]?.mapValue?.fields?.[
      RESERVED_REGEX_PATTERN_KEY
    ]?.stringValue ?? '';
  const leftOptions =
    leftFields?.[RESERVED_REGEX_KEY]?.mapValue?.fields?.[
      RESERVED_REGEX_OPTIONS_KEY
    ]?.stringValue ?? '';

  const rightFields = right.mapValue!.fields;
  const rightPattern =
    rightFields?.[RESERVED_REGEX_KEY]?.mapValue?.fields?.[
      RESERVED_REGEX_PATTERN_KEY
    ]?.stringValue ?? '';
  const rightOptions =
    rightFields?.[RESERVED_REGEX_KEY]?.mapValue?.fields?.[
      RESERVED_REGEX_OPTIONS_KEY
    ]?.stringValue ?? '';

  // First order by patterns, and then options.
  const patternDiff = primitiveComparator(leftPattern, rightPattern);
  return patternDiff !== 0
    ? patternDiff
    : primitiveComparator(leftOptions, rightOptions);
}

function compareBsonObjectIds(left: Value, right: Value): number {
  const leftOid =
    left.mapValue!.fields?.[RESERVED_BSON_OBJECT_ID_KEY]?.stringValue ?? '';
  const rightOid =
    right.mapValue!.fields?.[RESERVED_BSON_OBJECT_ID_KEY]?.stringValue ?? '';

  // TODO(Mila/BSON): use compareUtf8Strings once the bug fix is merged.
  return primitiveComparator(leftOid, rightOid);
}

/**
 * Generates the canonical ID for the provided field value (as used in Target
 * serialization).
 */
export function canonicalId(value: Value): string {
  return canonifyValue(value);
}

function canonifyValue(value: Value): string {
  if ('nullValue' in value) {
    return 'null';
  } else if ('booleanValue' in value) {
    return '' + value.booleanValue!;
  } else if ('integerValue' in value) {
    return '' + value.integerValue!;
  } else if ('doubleValue' in value) {
    return '' + value.doubleValue!;
  } else if ('timestampValue' in value) {
    return canonifyTimestamp(value.timestampValue!);
  } else if ('stringValue' in value) {
    return value.stringValue!;
  } else if ('bytesValue' in value) {
    return canonifyByteString(value.bytesValue!);
  } else if ('referenceValue' in value) {
    return canonifyReference(value.referenceValue!);
  } else if ('geoPointValue' in value) {
    return canonifyGeoPoint(value.geoPointValue!);
  } else if ('arrayValue' in value) {
    return canonifyArray(value.arrayValue!);
  } else if ('mapValue' in value) {
    // BsonBinaryValue contains an array of bytes, and needs to extract `subtype` and `data` from it before canonifying.
    if (detectSpecialMapType(value) === SpecialMapValueType.BSON_BINARY) {
      return canonifyBsonBinaryData(value.mapValue!);
    }
    return canonifyMap(value.mapValue!);
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

function canonifyByteString(byteString: string | Uint8Array): string {
  return normalizeByteString(byteString).toBase64();
}

function canonifyTimestamp(timestamp: Timestamp): string {
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  return `time(${normalizedTimestamp.seconds},${normalizedTimestamp.nanos})`;
}

function canonifyGeoPoint(geoPoint: LatLng): string {
  return `geo(${geoPoint.latitude},${geoPoint.longitude})`;
}

function canonifyReference(referenceValue: string): string {
  return DocumentKey.fromName(referenceValue).toString();
}

function canonifyBsonBinaryData(mapValue: MapValue): string {
  const fields = mapValue!.fields?.[RESERVED_BSON_BINARY_KEY];
  const subtypeAndData = fields?.bytesValue;
  if (!subtypeAndData) {
    throw new Error('Received incorrect bytesValue for BsonBinaryData');
  }
  // Normalize the bytesValue to Uint8Array before extracting subtype and data.
  const bytes = normalizeByteString(subtypeAndData).toUint8Array();
  return `{__binary__:{subType:${bytes.at(0)},data:${canonifyByteString(
    bytes.slice(1)
  )}}}`;
}

function canonifyMap(mapValue: MapValue): string {
  // Iteration order in JavaScript is not guaranteed. To ensure that we generate
  // matching canonical IDs for identical maps, we need to sort the keys.
  const sortedKeys = Object.keys(mapValue.fields || {}).sort();

  let result = '{';
  let first = true;
  for (const key of sortedKeys) {
    if (!first) {
      result += ',';
    } else {
      first = false;
    }
    result += `${key}:${canonifyValue(mapValue.fields![key])}`;
  }
  return result + '}';
}

function canonifyArray(arrayValue: ArrayValue): string {
  let result = '[';
  let first = true;
  for (const value of arrayValue.values || []) {
    if (!first) {
      result += ',';
    } else {
      first = false;
    }
    result += canonifyValue(value);
  }
  return result + ']';
}

/**
 * Returns an approximate (and wildly inaccurate) in-memory size for the field
 * value.
 *
 * The memory size takes into account only the actual user data as it resides
 * in memory and ignores object overhead.
 */
export function estimateByteSize(value: Value): number {
  switch (typeOrder(value)) {
    case TypeOrder.NullValue:
      return 4;
    case TypeOrder.BooleanValue:
      return 4;
    case TypeOrder.NumberValue:
      // TODO(Mila/BSON): return 16 if the value is 128 decimal value
      return 8;
    case TypeOrder.TimestampValue:
      // Timestamps are made up of two distinct numbers (seconds + nanoseconds)
      return 16;
    case TypeOrder.ServerTimestampValue:
      const previousValue = getPreviousValue(value);
      return previousValue ? 16 + estimateByteSize(previousValue) : 16;
    case TypeOrder.StringValue:
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures:
      // "JavaScript's String type is [...] a set of elements of 16-bit unsigned
      // integer values"
      return value.stringValue!.length * 2;
    case TypeOrder.BlobValue:
      return normalizeByteString(value.bytesValue!).approximateByteSize();
    case TypeOrder.RefValue:
      return value.referenceValue!.length;
    case TypeOrder.GeoPointValue:
      // GeoPoints are made up of two distinct numbers (latitude + longitude)
      return 16;
    case TypeOrder.ArrayValue:
      return estimateArrayByteSize(value.arrayValue!);
    case TypeOrder.VectorValue:
    case TypeOrder.ObjectValue:
    case TypeOrder.RegexValue:
    case TypeOrder.BsonObjectIdValue:
    case TypeOrder.BsonBinaryValue:
    case TypeOrder.BsonTimestampValue:
    case TypeOrder.MinKeyValue:
    case TypeOrder.MaxKeyValue:
      return estimateMapByteSize(value.mapValue!);
    default:
      throw fail('Invalid value type: ' + JSON.stringify(value));
  }
}

function estimateMapByteSize(mapValue: MapValue): number {
  let size = 0;
  forEach(mapValue.fields, (key, val) => {
    size += key.length + estimateByteSize(val);
  });
  return size;
}

function estimateArrayByteSize(arrayValue: ArrayValue): number {
  return (arrayValue.values || []).reduce(
    (previousSize, value) => previousSize + estimateByteSize(value),
    0
  );
}

/** Returns a reference value for the provided database and key. */
export function refValue(databaseId: DatabaseId, key: DocumentKey): Value {
  return {
    referenceValue: `projects/${databaseId.projectId}/databases/${
      databaseId.database
    }/documents/${key.path.canonicalString()}`
  };
}

/** Returns true if `value` is an IntegerValue . */
export function isInteger(
  value?: Value | null
): value is { integerValue: string | number } {
  return !!value && 'integerValue' in value;
}

/** Returns true if `value` is a DoubleValue. */
export function isDouble(
  value?: Value | null
): value is { doubleValue: string | number } {
  return !!value && 'doubleValue' in value;
}

/** Returns true if `value` is either an IntegerValue or a DoubleValue. */
export function isNumber(value?: Value | null): boolean {
  return isInteger(value) || isDouble(value);
}

/** Returns true if `value` is an ArrayValue. */
export function isArray(
  value?: Value | null
): value is { arrayValue: ArrayValue } {
  return !!value && 'arrayValue' in value;
}

/** Returns true if `value` is a ReferenceValue. */
export function isReferenceValue(
  value?: Value | null
): value is { referenceValue: string } {
  return !!value && 'referenceValue' in value;
}

/** Returns true if `value` is a NullValue. */
export function isNullValue(
  value?: Value | null
): value is { nullValue: 'NULL_VALUE' } {
  return !!value && 'nullValue' in value;
}

/** Returns true if `value` is NaN. */
export function isNanValue(
  value?: Value | null
): value is { doubleValue: 'NaN' | number } {
  return !!value && 'doubleValue' in value && isNaN(Number(value.doubleValue));
}

/** Returns true if `value` is a MapValue. */
export function isMapValue(
  value?: Value | null
): value is { mapValue: MapValue } {
  return !!value && 'mapValue' in value;
}

export function detectSpecialMapType(value: Value): SpecialMapValueType {
  if (!value || !value.mapValue || !value.mapValue.fields) {
    return SpecialMapValueType.REGULAR_MAP; // Not a special map type
  }

  const fields = value.mapValue.fields;

  // Check for type-based mappings
  const type = fields[TYPE_KEY]?.stringValue;
  if (type) {
    const typeMap: Record<string, SpecialMapValueType> = {
      [RESERVED_VECTOR_KEY]: SpecialMapValueType.VECTOR,
      [RESERVED_MAX_KEY]: SpecialMapValueType.INTERNAL_MAX,
      [RESERVED_SERVER_TIMESTAMP_KEY]: SpecialMapValueType.SERVER_TIMESTAMP
    };
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  // Check for BSON-related mappings
  const bsonMap: Record<string, SpecialMapValueType> = {
    [RESERVED_REGEX_KEY]: SpecialMapValueType.REGEX,
    [RESERVED_BSON_OBJECT_ID_KEY]: SpecialMapValueType.BSON_OBJECT_ID,
    [RESERVED_INT32_KEY]: SpecialMapValueType.INT32,
    [RESERVED_BSON_TIMESTAMP_KEY]: SpecialMapValueType.BSON_TIMESTAMP,
    [RESERVED_BSON_BINARY_KEY]: SpecialMapValueType.BSON_BINARY,
    [RESERVED_MIN_KEY]: SpecialMapValueType.MIN_KEY,
    [RESERVED_MAX_KEY]: SpecialMapValueType.MAX_KEY
  };

  for (const key in bsonMap) {
    if (fields[key]) {
      return bsonMap[key];
    }
  }

  return SpecialMapValueType.REGULAR_MAP;
}

export function isBsonType(value: Value): boolean {
  const bsonTypes = new Set([
    SpecialMapValueType.REGEX,
    SpecialMapValueType.BSON_OBJECT_ID,
    SpecialMapValueType.INT32,
    SpecialMapValueType.BSON_TIMESTAMP,
    SpecialMapValueType.BSON_BINARY,
    SpecialMapValueType.MIN_KEY,
    SpecialMapValueType.MAX_KEY
  ]);
  return bsonTypes.has(detectSpecialMapType(value));
}

/** Creates a deep copy of `source`. */
export function deepClone(source: Value): Value {
  if (source.geoPointValue) {
    return { geoPointValue: { ...source.geoPointValue } };
  } else if (
    source.timestampValue &&
    typeof source.timestampValue === 'object'
  ) {
    return { timestampValue: { ...source.timestampValue } };
  } else if (source.mapValue) {
    const target: Value = { mapValue: { fields: {} } };
    forEach(
      source.mapValue.fields,
      (key, val) => (target.mapValue!.fields![key] = deepClone(val))
    );
    return target;
  } else if (source.arrayValue) {
    const target: Value = { arrayValue: { values: [] } };
    for (let i = 0; i < (source.arrayValue.values || []).length; ++i) {
      target.arrayValue!.values![i] = deepClone(source.arrayValue.values![i]);
    }
    return target;
  } else {
    return { ...source };
  }
}

/** Returns the lowest value for the given value type (inclusive). */
export function valuesGetLowerBound(value: Value): Value {
  if ('nullValue' in value) {
    return INTERNAL_MIN_VALUE;
  } else if ('booleanValue' in value) {
    return { booleanValue: false };
  } else if ('integerValue' in value || 'doubleValue' in value) {
    return { doubleValue: NaN };
  } else if ('timestampValue' in value) {
    return { timestampValue: { seconds: Number.MIN_SAFE_INTEGER } };
  } else if ('stringValue' in value) {
    return { stringValue: '' };
  } else if ('bytesValue' in value) {
    return { bytesValue: '' };
  } else if ('referenceValue' in value) {
    return refValue(DatabaseId.empty(), DocumentKey.empty());
  } else if ('geoPointValue' in value) {
    return { geoPointValue: { latitude: -90, longitude: -180 } };
  } else if ('arrayValue' in value) {
    return { arrayValue: {} };
  } else if ('mapValue' in value) {
    const type = detectSpecialMapType(value);
    if (type === SpecialMapValueType.VECTOR) {
      return MIN_VECTOR_VALUE;
    } else if (type === SpecialMapValueType.BSON_OBJECT_ID) {
      return MIN_BSON_OBJECT_ID_VALUE;
    } else if (type === SpecialMapValueType.BSON_TIMESTAMP) {
      return MIN_BSON_TIMESTAMP_VALUE;
    } else if (type === SpecialMapValueType.BSON_BINARY) {
      return MIN_BSON_BINARY_VALUE;
    } else if (type === SpecialMapValueType.REGEX) {
      return MIN_REGEX_VALUE;
    } else if (type === SpecialMapValueType.INT32) {
      // int32Value is treated the same as integerValue and doubleValue
      return { doubleValue: NaN };
    } else if (type === SpecialMapValueType.MIN_KEY) {
      return MIN_KEY_VALUE;
    } else if (type === SpecialMapValueType.MAX_KEY) {
      return MAX_KEY_VALUE;
    }
    return { mapValue: {} };
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

/** Returns the largest value for the given value type (exclusive). */
export function valuesGetUpperBound(value: Value): Value {
  if ('nullValue' in value) {
    return MIN_KEY_VALUE;
  } else if ('booleanValue' in value) {
    return { doubleValue: NaN };
  } else if ('integerValue' in value || 'doubleValue' in value) {
    return { timestampValue: { seconds: Number.MIN_SAFE_INTEGER } };
  } else if ('timestampValue' in value) {
    return MIN_BSON_TIMESTAMP_VALUE;
  } else if ('stringValue' in value) {
    return { bytesValue: '' };
  } else if ('bytesValue' in value) {
    return MIN_BSON_BINARY_VALUE;
  } else if ('referenceValue' in value) {
    return MIN_BSON_OBJECT_ID_VALUE;
  } else if ('geoPointValue' in value) {
    return MIN_REGEX_VALUE;
  } else if ('arrayValue' in value) {
    return MIN_VECTOR_VALUE;
  } else if ('mapValue' in value) {
    const type = detectSpecialMapType(value);
    if (type === SpecialMapValueType.VECTOR) {
      return { mapValue: {} };
    } else if (type === SpecialMapValueType.BSON_OBJECT_ID) {
      return { geoPointValue: { latitude: -90, longitude: -180 } };
    } else if (type === SpecialMapValueType.BSON_TIMESTAMP) {
      return { stringValue: '' };
    } else if (type === SpecialMapValueType.BSON_BINARY) {
      return refValue(DatabaseId.empty(), DocumentKey.empty());
    } else if (type === SpecialMapValueType.REGEX) {
      return { arrayValue: {} };
    } else if (type === SpecialMapValueType.INT32) {
      // int32Value is treated the same as integerValue and doubleValue
      return { timestampValue: { seconds: Number.MIN_SAFE_INTEGER } };
    } else if (type === SpecialMapValueType.MIN_KEY) {
      return { booleanValue: false };
    } else if (type === SpecialMapValueType.MAX_KEY) {
      return INTERNAL_MAX_VALUE;
    }
    return MAX_KEY_VALUE;
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

export function lowerBoundCompare(
  left: { value: Value; inclusive: boolean },
  right: { value: Value; inclusive: boolean }
): number {
  const cmp = valueCompare(left.value, right.value);
  if (cmp !== 0) {
    return cmp;
  }

  if (left.inclusive && !right.inclusive) {
    return -1;
  } else if (!left.inclusive && right.inclusive) {
    return 1;
  }

  return 0;
}

export function upperBoundCompare(
  left: { value: Value; inclusive: boolean },
  right: { value: Value; inclusive: boolean }
): number {
  const cmp = valueCompare(left.value, right.value);
  if (cmp !== 0) {
    return cmp;
  }

  if (left.inclusive && !right.inclusive) {
    return 1;
  } else if (!left.inclusive && right.inclusive) {
    return -1;
  }

  return 0;
}

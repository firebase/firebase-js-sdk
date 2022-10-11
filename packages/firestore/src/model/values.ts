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
import {
  getLocalWriteTime,
  getPreviousValue,
  isServerTimestamp
} from './server_timestamps';
import { TypeOrder } from './type_order';

const MAX_VALUE_TYPE = '__max__';
export const MAX_VALUE: Value = {
  mapValue: {
    fields: {
      '__type__': { stringValue: MAX_VALUE_TYPE }
    }
  }
};

export const MIN_VALUE: Value = {
  nullValue: 'NULL_VALUE'
};

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
    if (isServerTimestamp(value)) {
      return TypeOrder.ServerTimestampValue;
    } else if (isMaxValue(value)) {
      return TypeOrder.MaxValue;
    }
    return TypeOrder.ObjectValue;
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
    case TypeOrder.ObjectValue:
      return objectEquals(left, right);
    case TypeOrder.MaxValue:
      return true;
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
  if ('integerValue' in left && 'integerValue' in right) {
    return (
      normalizeNumber(left.integerValue) === normalizeNumber(right.integerValue)
    );
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
    case TypeOrder.ObjectValue:
      return compareMaps(left.mapValue!, right.mapValue!);
    default:
      throw fail('Invalid value type: ' + leftType);
  }
}

function compareNumbers(left: Value, right: Value): number {
  const leftNumber = normalizeNumber(left.integerValue || left.doubleValue);
  const rightNumber = normalizeNumber(right.integerValue || right.doubleValue);

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

function compareMaps(left: MapValue, right: MapValue): number {
  if (left === MAX_VALUE.mapValue && right === MAX_VALUE.mapValue) {
    return 0;
  } else if (left === MAX_VALUE.mapValue) {
    return 1;
  } else if (right === MAX_VALUE.mapValue) {
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
    case TypeOrder.ObjectValue:
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

/** Returns true if the Value represents the canonical {@link #MAX_VALUE} . */
export function isMaxValue(value: Value): boolean {
  return (
    (((value.mapValue || {}).fields || {})['__type__'] || {}).stringValue ===
    MAX_VALUE_TYPE
  );
}

/** Returns the lowest value for the given value type (inclusive). */
export function valuesGetLowerBound(value: Value): Value {
  if ('nullValue' in value) {
    return MIN_VALUE;
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
    return { mapValue: {} };
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

/** Returns the largest value for the given value type (exclusive). */
export function valuesGetUpperBound(value: Value): Value {
  if ('nullValue' in value) {
    return { booleanValue: false };
  } else if ('booleanValue' in value) {
    return { doubleValue: NaN };
  } else if ('integerValue' in value || 'doubleValue' in value) {
    return { timestampValue: { seconds: Number.MIN_SAFE_INTEGER } };
  } else if ('timestampValue' in value) {
    return { stringValue: '' };
  } else if ('stringValue' in value) {
    return { bytesValue: '' };
  } else if ('bytesValue' in value) {
    return refValue(DatabaseId.empty(), DocumentKey.empty());
  } else if ('referenceValue' in value) {
    return { geoPointValue: { latitude: -90, longitude: -180 } };
  } else if ('geoPointValue' in value) {
    return { arrayValue: {} };
  } else if ('arrayValue' in value) {
    return { mapValue: {} };
  } else if ('mapValue' in value) {
    return MAX_VALUE;
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

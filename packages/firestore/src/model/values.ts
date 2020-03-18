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

import * as api from '../protos/firestore_proto_api';

import { TypeOrder } from './field_value';
import { assert, fail } from '../util/assert';
import { forEach, keys, size } from '../util/obj';
import { ByteString } from '../util/byte_string';
import { DocumentKey } from './document_key';
import {
  numericComparator,
  numericEquals,
  primitiveComparator
} from '../util/misc';

// A RegExp matching ISO 8601 UTC timestamps with optional fraction.
const ISO_TIMESTAMP_REG_EXP = new RegExp(
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/
);

/** Extracts the backend's type order for the provided value. */
export function typeOrder(value: api.Value): TypeOrder {
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
    return TypeOrder.ObjectValue;
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

/** Returns whether `value` is defined and corresponds to the given type order. */
export function isType(
  value: api.Value | null | undefined,
  expectedTypeOrder: TypeOrder
): value is api.Value {
  return !!value && typeOrder(value) === expectedTypeOrder;
}

/** Tests `left` and `right` for equality based on the backend semantics. */
export function equals(left: api.Value, right: api.Value): boolean {
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
      return arrayEquals(left, right);
    case TypeOrder.ObjectValue:
      return objectEquals(left, right);
    default:
      return fail('Unexpected value type: ' + JSON.stringify(left));
  }
}

function timestampEquals(left: api.Value, right: api.Value): boolean {
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

function geoPointEquals(left: api.Value, right: api.Value): boolean {
  return (
    normalizeNumber(left.geoPointValue!.latitude) ===
      normalizeNumber(right.geoPointValue!.latitude) &&
    normalizeNumber(left.geoPointValue!.longitude) ===
      normalizeNumber(right.geoPointValue!.longitude)
  );
}

function blobEquals(left: api.Value, right: api.Value): boolean {
  return normalizeByteString(left.bytesValue!).isEqual(
    normalizeByteString(right.bytesValue!)
  );
}

export function numberEquals(left: api.Value, right: api.Value): boolean {
  if ('integerValue' in left && 'integerValue' in right) {
    return numericEquals(
      normalizeNumber(left.integerValue),
      normalizeNumber(right.integerValue)
    );
  } else if ('doubleValue' in left && 'doubleValue' in right) {
    return numericEquals(
      normalizeNumber(left.doubleValue),
      normalizeNumber(right.doubleValue)
    );
  }

  return false;
}

function arrayEquals(left: api.Value, right: api.Value): boolean {
  const leftArray = left.arrayValue!.values || [];
  const rightArray = right.arrayValue!.values || [];

  if (leftArray.length !== rightArray.length) {
    return false;
  }

  for (let i = 0; i < leftArray.length; ++i) {
    if (!equals(leftArray[i], rightArray[i])) {
      return false;
    }
  }
  return true;
}

function objectEquals(left: api.Value, right: api.Value): boolean {
  const leftMap = left.mapValue!.fields || {};
  const rightMap = right.mapValue!.fields || {};

  if (size(leftMap) !== size(rightMap)) {
    return false;
  }

  for (const key in leftMap) {
    if (leftMap.hasOwnProperty(key)) {
      if (rightMap[key] === undefined || !equals(leftMap[key], rightMap[key])) {
        return false;
      }
    }
  }
  return true;
}

export function compare(left: api.Value, right: api.Value): number {
  const leftType = typeOrder(left);
  const rightType = typeOrder(right);

  if (leftType !== rightType) {
    return primitiveComparator(leftType, rightType);
  }

  switch (leftType) {
    case TypeOrder.NullValue:
      return 0;
    case TypeOrder.BooleanValue:
      return primitiveComparator(left.booleanValue!, right.booleanValue!);
    case TypeOrder.NumberValue:
      return compareNumbers(left, right);
    case TypeOrder.TimestampValue:
      return compareTimestamps(left.timestampValue!, right.timestampValue!);
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

function compareNumbers(left: api.Value, right: api.Value): number {
  const leftNumber =
    'doubleValue' in left
      ? normalizeNumber(left.doubleValue)
      : normalizeNumber(left.integerValue);
  const rightNumber =
    'doubleValue' in right
      ? normalizeNumber(right.doubleValue)
      : normalizeNumber(right.integerValue);
  return numericComparator(leftNumber, rightNumber);
}

function compareTimestamps(left: api.Timestamp, right: api.Timestamp): number {
  if (typeof left === 'string' && typeof right === 'string') {
    // Use string ordering for ISO 8601 timestamps, but strip the timezone
    // suffix to ensure proper ordering for timestamps of different precision.
    // The only supported timezone is UTC (i.e. 'Z') based on
    // ISO_TIMESTAMP_REG_EXP.
    return primitiveComparator(left.slice(0, -1), right.slice(0, -1));
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

function compareGeoPoints(left: api.LatLng, right: api.LatLng): number {
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

function compareArrays(left: api.ArrayValue, right: api.ArrayValue): number {
  const leftArray = left.values || [];
  const rightArray = right.values || [];

  for (let i = 0; i < leftArray.length && i < rightArray.length; ++i) {
    const valueCompare = compare(leftArray[i], rightArray[i]);
    if (valueCompare) {
      return valueCompare;
    }
  }
  return primitiveComparator(leftArray.length, rightArray.length);
}

function compareMaps(left: api.MapValue, right: api.MapValue): number {
  const leftMap = left.fields || {};
  const leftKeys = keys(leftMap);
  const rightMap = right.fields || {};
  const rightKeys = keys(rightMap);

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
    const valueCompare = compare(leftMap[leftKeys[i]], rightMap[rightKeys[i]]);
    if (valueCompare !== 0) {
      return valueCompare;
    }
  }

  return primitiveComparator(leftKeys.length, rightKeys.length);
}

/**
 * Generates the canonical ID for the provided field value (as used in Target
 * serialization).
 */
export function canonicalId(value: api.Value): string {
  return canonifyValue(value);
}

function canonifyValue(value: api.Value): string {
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

function canonifyTimestamp(timestamp: api.Timestamp): string {
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  return `time(${normalizedTimestamp.seconds},${normalizedTimestamp.nanos})`;
}

function canonifyGeoPoint(geoPoint: api.LatLng): string {
  return `geo(${geoPoint.latitude},${geoPoint.longitude})`;
}

function canonifyReference(referenceValue: string): string {
  return DocumentKey.fromName(referenceValue).toString();
}

function canonifyMap(mapValue: api.MapValue): string {
  // Iteration order in JavaScript is not guaranteed. To ensure that we generate
  // matching canonical IDs for identical maps, we need to sort the keys.
  const sortedKeys = keys(mapValue.fields || {}).sort();

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

function canonifyArray(arrayValue: api.ArrayValue): string {
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
export function estimateByteSize(value: api.Value): number {
  if ('nullValue' in value) {
    return 4;
  } else if ('booleanValue' in value) {
    return 4;
  } else if ('integerValue' in value) {
    return 8;
  } else if ('doubleValue' in value) {
    return 8;
  } else if ('timestampValue' in value) {
    // TODO(mrschmidt: Add ServerTimestamp support
    // Timestamps are made up of two distinct numbers (seconds + nanoseconds)
    return 16;
  } else if ('stringValue' in value) {
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures:
    // "JavaScript's String type is [...] a set of elements of 16-bit unsigned
    // integer values"
    return value.stringValue!.length * 2;
  } else if ('bytesValue' in value) {
    return normalizeByteString(value.bytesValue!).approximateByteSize();
  } else if ('referenceValue' in value) {
    return value.referenceValue!.length;
  } else if ('geoPointValue' in value) {
    // GeoPoints are made up of two distinct numbers (latitude + longitude)
    return 16;
  } else if ('arrayValue' in value) {
    return estimateArrayByteSize(value.arrayValue!);
  } else if ('mapValue' in value) {
    return estimateMapByteSize(value.mapValue!);
  } else {
    return fail('Invalid value type: ' + JSON.stringify(value));
  }
}

function estimateMapByteSize(mapValue: api.MapValue): number {
  let size = 0;
  forEach(mapValue.fields || {}, (key, val) => {
    size += key.length + estimateByteSize(val);
  });
  return size;
}

function estimateArrayByteSize(arrayValue: api.ArrayValue): number {
  return (arrayValue.values || []).reduce(
    (previousSize, value) => previousSize + estimateByteSize(value),
    0
  );
}

/**
 * Converts the possible Proto values for a timestamp value into a "seconds and
 * nanos" representation.
 */
export function normalizeTimestamp(
  date: api.Timestamp
): { seconds: number; nanos: number } {
  assert(!!date, 'Cannot normalize null or undefined timestamp.');

  // The json interface (for the browser) will return an iso timestamp string,
  // while the proto js library (for node) will return a
  // google.protobuf.Timestamp instance.
  if (typeof date === 'string') {
    // The date string can have higher precision (nanos) than the Date class
    // (millis), so we do some custom parsing here.

    // Parse the nanos right out of the string.
    let nanos = 0;
    const fraction = ISO_TIMESTAMP_REG_EXP.exec(date);
    assert(!!fraction, 'invalid timestamp: ' + date);
    if (fraction[1]) {
      // Pad the fraction out to 9 digits (nanos).
      let nanoStr = fraction[1];
      nanoStr = (nanoStr + '000000000').substr(0, 9);
      nanos = Number(nanoStr);
    }

    // Parse the date to get the seconds.
    const parsedDate = new Date(date);
    const seconds = Math.floor(parsedDate.getTime() / 1000);

    return { seconds, nanos };
  } else {
    // TODO(b/37282237): Use strings for Proto3 timestamps
    // assert(!this.options.useProto3Json,
    //   'The timestamp instance format requires Proto JS.');
    const seconds = normalizeNumber(date.seconds);
    const nanos = normalizeNumber(date.nanos);
    return { seconds, nanos };
  }
}

/** Converts the possible Proto types for numbers into a JavaScript number. */
export function normalizeNumber(value: number | string | undefined): number {
  // TODO(bjornick): Handle int64 greater than 53 bits.
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    return Number(value);
  } else {
    return 0;
  }
}

/** Converts the possible Proto types for Blobs into a ByteString. */
export function normalizeByteString(blob: string | Uint8Array): ByteString {
  if (typeof blob === 'string') {
    return ByteString.fromBase64String(blob);
  } else {
    return ByteString.fromUint8Array(blob);
  }
}

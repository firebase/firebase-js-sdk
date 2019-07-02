/**
 * @license
 * Copyright 2017 Google Inc.
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

import { Blob } from '../api/blob';
import { SnapshotOptions } from '../api/database';
import { GeoPoint } from '../api/geo_point';
import { Timestamp } from '../api/timestamp';
import { DatabaseId } from '../core/database_info';
import { assert, fail } from '../util/assert';
import { primitiveComparator } from '../util/misc';
import { DocumentKey } from './document_key';
import { FieldMask } from './mutation';
import { FieldPath } from './path';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';

/**
 * Supported data value types:
 *  - Null
 *  - Boolean
 *  - Long
 *  - Double
 *  - String
 *  - Object
 *  - Array
 *  - Binary
 *  - Timestamp
 *  - ServerTimestamp (a sentinel used in uncommitted writes)
 *  - GeoPoint
 *  - (Document) References
 */

export interface JsonObject<T> {
  [name: string]: T;
}

export enum TypeOrder {
  // This order is defined by the backend.
  NullValue = 0,
  BooleanValue = 1,
  NumberValue = 2,
  TimestampValue = 3,
  StringValue = 4,
  BlobValue = 5,
  RefValue = 6,
  GeoPointValue = 7,
  ArrayValue = 8,
  ObjectValue = 9
}

/** Defines the return value for pending server timestamps. */
export enum ServerTimestampBehavior {
  Default,
  Estimate,
  Previous
}

/** Holds properties that define field value deserialization options. */
export class FieldValueOptions {
  constructor(
    readonly serverTimestampBehavior: ServerTimestampBehavior,
    readonly timestampsInSnapshots: boolean
  ) {}

  static fromSnapshotOptions(
    options: SnapshotOptions,
    timestampsInSnapshots: boolean
  ): FieldValueOptions {
    switch (options.serverTimestamps) {
      case 'estimate':
        return new FieldValueOptions(
          ServerTimestampBehavior.Estimate,
          timestampsInSnapshots
        );
      case 'previous':
        return new FieldValueOptions(
          ServerTimestampBehavior.Previous,
          timestampsInSnapshots
        );
      case 'none': // Fall-through intended.
      case undefined:
        return new FieldValueOptions(
          ServerTimestampBehavior.Default,
          timestampsInSnapshots
        );
      default:
        return fail('fromSnapshotOptions() called with invalid options.');
    }
  }
}

/**
 * Potential types returned by FieldValue.value(). This could be stricter
 * (instead of using {}), but there's little benefit.
 *
 * Note that currently we use AnyJs (which is identical except includes
 * undefined) for incoming user data as a convenience to the calling code (but
 * we'll throw if the data contains undefined). This should probably be changed
 * to use FieldType, but all consuming code will have to be updated to
 * explicitly handle undefined and then cast to FieldType or similar. Perhaps
 * we should tackle this when adding robust argument validation to the API.
 */
export type FieldType = null | boolean | number | string | {};

/**
 * A field value represents a datatype as stored by Firestore.
 */
export abstract class FieldValue {
  readonly typeOrder: TypeOrder;

  abstract value(options?: FieldValueOptions): FieldType;
  abstract isEqual(other: FieldValue): boolean;
  abstract compareTo(other: FieldValue): number;

  toString(): string {
    const val = this.value();
    return val === null ? 'null' : val.toString();
  }

  defaultCompareTo(other: FieldValue): number {
    assert(
      this.typeOrder !== other.typeOrder,
      'Default compareTo should not be used for values of same type.'
    );
    const cmp = primitiveComparator(this.typeOrder, other.typeOrder);
    return cmp;
  }
}

export class NullValue extends FieldValue {
  typeOrder = TypeOrder.NullValue;

  // internalValue is unused but we add it to work around
  // https://github.com/Microsoft/TypeScript/issues/15585
  readonly internalValue = null;

  private constructor() {
    super();
  }

  value(options?: FieldValueOptions): null {
    return null;
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof NullValue;
  }

  compareTo(other: FieldValue): number {
    if (other instanceof NullValue) {
      return 0;
    }
    return this.defaultCompareTo(other);
  }

  static INSTANCE = new NullValue();
}

export class BooleanValue extends FieldValue {
  typeOrder = TypeOrder.BooleanValue;

  private constructor(readonly internalValue: boolean) {
    super();
  }

  value(options?: FieldValueOptions): boolean {
    return this.internalValue;
  }

  isEqual(other: FieldValue): boolean {
    return (
      other instanceof BooleanValue &&
      this.internalValue === other.internalValue
    );
  }

  compareTo(other: FieldValue): number {
    if (other instanceof BooleanValue) {
      return primitiveComparator(this, other);
    }
    return this.defaultCompareTo(other);
  }

  static of(value: boolean): BooleanValue {
    return value ? BooleanValue.TRUE : BooleanValue.FALSE;
  }

  static TRUE = new BooleanValue(true);
  static FALSE = new BooleanValue(false);
}

/** Base class for IntegerValue and DoubleValue. */
export abstract class NumberValue extends FieldValue {
  typeOrder = TypeOrder.NumberValue;

  constructor(readonly internalValue: number) {
    super();
  }

  value(options?: FieldValueOptions): number {
    return this.internalValue;
  }

  compareTo(other: FieldValue): number {
    if (other instanceof NumberValue) {
      return numericComparator(this.internalValue, other.internalValue);
    }
    return this.defaultCompareTo(other);
  }
}

/** Utility function to compare doubles (using Firestore semantics for NaN). */
function numericComparator(left: number, right: number): number {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  } else if (left === right) {
    return 0;
  } else {
    // one or both are NaN.
    if (isNaN(left)) {
      return isNaN(right) ? 0 : -1;
    } else {
      return 1;
    }
  }
}

/**
 * Utility function to check numbers for equality using Firestore semantics
 * (NaN === NaN, -0.0 !== 0.0).
 */
function numericEquals(left: number, right: number): boolean {
  // Implemented based on Object.is() polyfill from
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  if (left === right) {
    // +0 != -0
    return left !== 0 || 1 / left === 1 / right;
  } else {
    // NaN == NaN
    return left !== left && right !== right;
  }
}

export class IntegerValue extends NumberValue {
  isEqual(other: FieldValue): boolean {
    // NOTE: DoubleValue and IntegerValue instances may compareTo() the same,
    // but that doesn't make them equal via isEqual().
    if (other instanceof IntegerValue) {
      return numericEquals(this.internalValue, other.internalValue);
    } else {
      return false;
    }
  }

  // NOTE: compareTo() is implemented in NumberValue.
}

export class DoubleValue extends NumberValue {
  static NAN = new DoubleValue(NaN);
  static POSITIVE_INFINITY = new DoubleValue(Infinity);
  static NEGATIVE_INFINITY = new DoubleValue(-Infinity);

  isEqual(other: FieldValue): boolean {
    // NOTE: DoubleValue and IntegerValue instances may compareTo() the same,
    // but that doesn't make them equal via isEqual().
    if (other instanceof DoubleValue) {
      return numericEquals(this.internalValue, other.internalValue);
    } else {
      return false;
    }
  }

  // NOTE: compareTo() is implemented in NumberValue.
}

// TODO(b/37267885): Add truncation support
export class StringValue extends FieldValue {
  typeOrder = TypeOrder.StringValue;

  constructor(readonly internalValue: string) {
    super();
  }

  value(options?: FieldValueOptions): string {
    return this.internalValue;
  }

  isEqual(other: FieldValue): boolean {
    return (
      other instanceof StringValue && this.internalValue === other.internalValue
    );
  }

  compareTo(other: FieldValue): number {
    if (other instanceof StringValue) {
      return primitiveComparator(this.internalValue, other.internalValue);
    }
    return this.defaultCompareTo(other);
  }
}

export class TimestampValue extends FieldValue {
  typeOrder = TypeOrder.TimestampValue;

  constructor(readonly internalValue: Timestamp) {
    super();
  }

  value(options?: FieldValueOptions): Date | Timestamp {
    if (!options || options.timestampsInSnapshots) {
      return this.internalValue;
    } else {
      return this.internalValue.toDate();
    }
  }

  isEqual(other: FieldValue): boolean {
    return (
      other instanceof TimestampValue &&
      this.internalValue.isEqual(other.internalValue)
    );
  }

  compareTo(other: FieldValue): number {
    if (other instanceof TimestampValue) {
      return this.internalValue._compareTo(other.internalValue);
    } else if (other instanceof ServerTimestampValue) {
      // Concrete timestamps come before server timestamps.
      return -1;
    } else {
      return this.defaultCompareTo(other);
    }
  }
}

/**
 * Represents a locally-applied ServerTimestamp.
 *
 * Notes:
 * - ServerTimestampValue instances are created as the result of applying a
 *   TransformMutation (see TransformMutation.applyTo()). They can only exist in
 *   the local view of a document. Therefore they do not need to be parsed or
 *   serialized.
 * - When evaluated locally (e.g. for snapshot.data()), they by default
 *   evaluate to `null`. This behavior can be configured by passing custom
 *   FieldValueOptions to value().
 * - With respect to other ServerTimestampValues, they sort by their
 *   localWriteTime.
 */
export class ServerTimestampValue extends FieldValue {
  typeOrder = TypeOrder.TimestampValue;

  constructor(
    readonly localWriteTime: Timestamp,
    readonly previousValue: FieldValue | null
  ) {
    super();
  }

  value(options?: FieldValueOptions): FieldType {
    if (
      options &&
      options.serverTimestampBehavior === ServerTimestampBehavior.Estimate
    ) {
      return new TimestampValue(this.localWriteTime).value(options);
    } else if (
      options &&
      options.serverTimestampBehavior === ServerTimestampBehavior.Previous
    ) {
      return this.previousValue ? this.previousValue.value(options) : null;
    } else {
      return null;
    }
  }

  isEqual(other: FieldValue): boolean {
    return (
      other instanceof ServerTimestampValue &&
      this.localWriteTime.isEqual(other.localWriteTime)
    );
  }

  compareTo(other: FieldValue): number {
    if (other instanceof ServerTimestampValue) {
      return this.localWriteTime._compareTo(other.localWriteTime);
    } else if (other instanceof TimestampValue) {
      // Server timestamps come after all concrete timestamps.
      return 1;
    } else {
      return this.defaultCompareTo(other);
    }
  }

  toString(): string {
    return '<ServerTimestamp localTime=' + this.localWriteTime.toString() + '>';
  }
}

export class BlobValue extends FieldValue {
  typeOrder = TypeOrder.BlobValue;

  constructor(readonly internalValue: Blob) {
    super();
  }

  value(options?: FieldValueOptions): Blob {
    return this.internalValue;
  }

  isEqual(other: FieldValue): boolean {
    return (
      other instanceof BlobValue &&
      this.internalValue.isEqual(other.internalValue)
    );
  }

  compareTo(other: FieldValue): number {
    if (other instanceof BlobValue) {
      return this.internalValue._compareTo(other.internalValue);
    }
    return this.defaultCompareTo(other);
  }
}

export class RefValue extends FieldValue {
  typeOrder = TypeOrder.RefValue;

  constructor(readonly databaseId: DatabaseId, readonly key: DocumentKey) {
    super();
  }

  value(options?: FieldValueOptions): DocumentKey {
    return this.key;
  }

  isEqual(other: FieldValue): boolean {
    if (other instanceof RefValue) {
      return (
        this.key.isEqual(other.key) && this.databaseId.isEqual(other.databaseId)
      );
    } else {
      return false;
    }
  }

  compareTo(other: FieldValue): number {
    if (other instanceof RefValue) {
      const cmp = this.databaseId.compareTo(other.databaseId);
      return cmp !== 0 ? cmp : DocumentKey.comparator(this.key, other.key);
    }
    return this.defaultCompareTo(other);
  }
}

export class GeoPointValue extends FieldValue {
  typeOrder = TypeOrder.GeoPointValue;

  constructor(readonly internalValue: GeoPoint) {
    super();
  }

  value(options?: FieldValueOptions): GeoPoint {
    return this.internalValue;
  }

  isEqual(other: FieldValue): boolean {
    return (
      other instanceof GeoPointValue &&
      this.internalValue.isEqual(other.internalValue)
    );
  }

  compareTo(other: FieldValue): number {
    if (other instanceof GeoPointValue) {
      return this.internalValue._compareTo(other.internalValue);
    }
    return this.defaultCompareTo(other);
  }
}

export class ObjectValue extends FieldValue {
  typeOrder = TypeOrder.ObjectValue;

  constructor(readonly internalValue: SortedMap<string, FieldValue>) {
    super();
  }

  value(options?: FieldValueOptions): JsonObject<FieldType> {
    const result: JsonObject<FieldType> = {};
    this.internalValue.inorderTraversal((key, val) => {
      result[key] = val.value(options);
    });
    return result;
  }

  forEach(action: (key: string, value: FieldValue) => void): void {
    this.internalValue.inorderTraversal(action);
  }

  isEqual(other: FieldValue): boolean {
    if (other instanceof ObjectValue) {
      const it1 = this.internalValue.getIterator();
      const it2 = other.internalValue.getIterator();
      while (it1.hasNext() && it2.hasNext()) {
        const next1: { key: string; value: FieldValue } = it1.getNext();
        const next2: { key: string; value: FieldValue } = it2.getNext();
        if (next1.key !== next2.key || !next1.value.isEqual(next2.value)) {
          return false;
        }
      }

      return !it1.hasNext() && !it2.hasNext();
    }

    return false;
  }

  compareTo(other: FieldValue): number {
    if (other instanceof ObjectValue) {
      const it1 = this.internalValue.getIterator();
      const it2 = other.internalValue.getIterator();
      while (it1.hasNext() && it2.hasNext()) {
        const next1: { key: string; value: FieldValue } = it1.getNext();
        const next2: { key: string; value: FieldValue } = it2.getNext();
        const cmp =
          primitiveComparator(next1.key, next2.key) ||
          next1.value.compareTo(next2.value);
        if (cmp) {
          return cmp;
        }
      }

      // Only equal if both iterators are exhausted
      return primitiveComparator(it1.hasNext(), it2.hasNext());
    } else {
      return this.defaultCompareTo(other);
    }
  }

  set(path: FieldPath, to: FieldValue): ObjectValue {
    assert(!path.isEmpty(), 'Cannot set field for empty path on ObjectValue');
    if (path.length === 1) {
      return this.setChild(path.firstSegment(), to);
    } else {
      let child = this.child(path.firstSegment());
      if (!(child instanceof ObjectValue)) {
        child = ObjectValue.EMPTY;
      }
      const newChild = (child as ObjectValue).set(path.popFirst(), to);
      return this.setChild(path.firstSegment(), newChild);
    }
  }

  delete(path: FieldPath): ObjectValue {
    assert(
      !path.isEmpty(),
      'Cannot delete field for empty path on ObjectValue'
    );
    if (path.length === 1) {
      return new ObjectValue(this.internalValue.remove(path.firstSegment()));
    } else {
      // nested field
      const child = this.child(path.firstSegment());
      if (child instanceof ObjectValue) {
        const newChild = child.delete(path.popFirst());
        return new ObjectValue(
          this.internalValue.insert(path.firstSegment(), newChild)
        );
      } else {
        // Don't actually change a primitive value to an object for a delete
        return this;
      }
    }
  }

  contains(path: FieldPath): boolean {
    return this.field(path) !== null;
  }

  field(path: FieldPath): FieldValue | null {
    assert(!path.isEmpty(), "Can't get field of empty path");
    let field: FieldValue | null = this;
    path.forEach((pathSegment: string) => {
      if (field instanceof ObjectValue) {
        field = field.internalValue.get(pathSegment);
      } else {
        field = null;
      }
    });
    return field;
  }

  /**
   * Returns a FieldMask built from all FieldPaths starting from this ObjectValue,
   * including paths from nested objects.
   */
  fieldMask(): FieldMask {
    let fields = new SortedSet<FieldPath>(FieldPath.comparator);
    this.internalValue.forEach((key, value) => {
      const currentPath = new FieldPath([key]);
      if (value instanceof ObjectValue) {
        const nestedMask = value.fieldMask();
        const nestedFields = nestedMask.fields;
        if (nestedFields.isEmpty()) {
          // Preserve the empty map by adding it to the FieldMask.
          fields = fields.add(currentPath);
        } else {
          // For nested and non-empty ObjectValues, add the FieldPath of the
          // leaf nodes.
          nestedFields.forEach(nestedPath => {
            fields = fields.add(currentPath.child(nestedPath));
          });
        }
      } else {
        fields = fields.add(currentPath);
      }
    });
    return FieldMask.fromSet(fields);
  }

  toString(): string {
    return this.internalValue.toString();
  }

  private child(childName: string): FieldValue | undefined {
    return this.internalValue.get(childName) || undefined;
  }

  private setChild(childName: string, value: FieldValue): ObjectValue {
    return new ObjectValue(this.internalValue.insert(childName, value));
  }

  static EMPTY = new ObjectValue(
    new SortedMap<string, FieldValue>(primitiveComparator)
  );
}

export class ArrayValue extends FieldValue {
  typeOrder = TypeOrder.ArrayValue;

  constructor(readonly internalValue: FieldValue[]) {
    super();
  }

  value(options?: FieldValueOptions): FieldType[] {
    return this.internalValue.map(v => v.value(options));
  }

  /**
   * Returns true if the given value is contained in this array.
   */
  contains(value: FieldValue): boolean {
    for (const element of this.internalValue) {
      if (element.isEqual(value)) {
        return true;
      }
    }
    return false;
  }

  forEach(action: (value: FieldValue) => void): void {
    this.internalValue.forEach(action);
  }

  isEqual(other: FieldValue): boolean {
    if (other instanceof ArrayValue) {
      if (this.internalValue.length !== other.internalValue.length) {
        return false;
      }

      for (let i = 0; i < this.internalValue.length; i++) {
        if (!this.internalValue[i].isEqual(other.internalValue[i])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  compareTo(other: FieldValue): number {
    if (other instanceof ArrayValue) {
      const minLength = Math.min(
        this.internalValue.length,
        other.internalValue.length
      );

      for (let i = 0; i < minLength; i++) {
        const cmp = this.internalValue[i].compareTo(other.internalValue[i]);

        if (cmp) {
          return cmp;
        }
      }

      return primitiveComparator(
        this.internalValue.length,
        other.internalValue.length
      );
    } else {
      return this.defaultCompareTo(other);
    }
  }

  toString(): string {
    const descriptions = this.internalValue.map(v => v.toString());
    return `[${descriptions.join(',')}]`;
  }
}

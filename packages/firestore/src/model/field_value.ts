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

import { GeoPoint } from '../api/geo_point';
import { Timestamp } from '../api/timestamp';
import { DatabaseId } from '../core/database_info';
import { assert } from '../util/assert';
import {
  numericComparator,
  numericEquals,
  primitiveComparator
} from '../util/misc';
import { DocumentKey } from './document_key';
import { FieldMask } from './mutation';
import { FieldPath } from './path';
import { ByteString } from '../util/byte_string';
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

export const enum TypeOrder {
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

/**
 * Potential types returned by FieldValue.value(). This could be stricter
 * (instead of using {}), but there's little benefit.
 *
 * Note that currently we use `unknown` (which is identical except includes
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
  abstract readonly typeOrder: TypeOrder;

  abstract value(): FieldType;
  abstract isEqual(other: FieldValue): boolean;
  abstract compareTo(other: FieldValue): number;

  /**
   * Returns an approximate (and wildly inaccurate) in-memory size for the field
   * value.
   *
   * The memory size takes into account only the actual user data as it resides
   * in memory and ignores object overhead.
   */
  abstract approximateByteSize(): number;

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

  value(): null {
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

  approximateByteSize(): number {
    return 4;
  }

  static INSTANCE = new NullValue();
}

export class BooleanValue extends FieldValue {
  typeOrder = TypeOrder.BooleanValue;

  private constructor(readonly internalValue: boolean) {
    super();
  }

  value(): boolean {
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
      return primitiveComparator(this.internalValue, other.internalValue);
    }
    return this.defaultCompareTo(other);
  }

  approximateByteSize(): number {
    return 4;
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

  value(): number {
    return this.internalValue;
  }

  compareTo(other: FieldValue): number {
    if (other instanceof NumberValue) {
      return numericComparator(this.internalValue, other.internalValue);
    }
    return this.defaultCompareTo(other);
  }

  approximateByteSize(): number {
    return 8;
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

  value(): string {
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

  approximateByteSize(): number {
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures:
    // "JavaScript's String type is [...] a set of elements of 16-bit unsigned
    // integer values"
    return this.internalValue.length * 2;
  }
}

export class TimestampValue extends FieldValue {
  typeOrder = TypeOrder.TimestampValue;

  constructor(readonly internalValue: Timestamp) {
    super();
  }

  value(): Timestamp {
    return this.internalValue;
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

  approximateByteSize(): number {
    // Timestamps are made up of two distinct numbers (seconds + nanoseconds)
    return 16;
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
  // TODO(mrschmidt): Represent ServerTimestamps as a PrimitiveType with a
  //  Map containing a private `__type__` field (or similar).

  typeOrder = TypeOrder.TimestampValue;

  constructor(
    readonly localWriteTime: Timestamp,
    readonly previousValue: FieldValue | null
  ) {
    super();
  }

  value(): null {
    return null;
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
    } else if (other.typeOrder === TypeOrder.TimestampValue) {
      // Server timestamps come after all concrete timestamps.
      return 1;
    } else {
      return this.defaultCompareTo(other);
    }
  }

  toString(): string {
    return '<ServerTimestamp localTime=' + this.localWriteTime.toString() + '>';
  }

  approximateByteSize(): number {
    return (
      /* localWriteTime */ 16 +
      (this.previousValue ? this.previousValue.approximateByteSize() : 0)
    );
  }
}

export class BlobValue extends FieldValue {
  typeOrder = TypeOrder.BlobValue;

  constructor(readonly internalValue: ByteString) {
    super();
  }

  value(): ByteString {
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
      return this.internalValue.compareTo(other.internalValue);
    }
    return this.defaultCompareTo(other);
  }

  approximateByteSize(): number {
    return this.internalValue.approximateByteSize();
  }
}

export class RefValue extends FieldValue {
  typeOrder = TypeOrder.RefValue;

  constructor(readonly databaseId: DatabaseId, readonly key: DocumentKey) {
    super();
  }

  value(): DocumentKey {
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

  approximateByteSize(): number {
    return (
      this.databaseId.projectId.length +
      this.databaseId.database.length +
      this.key.toString().length
    );
  }
}

export class GeoPointValue extends FieldValue {
  typeOrder = TypeOrder.GeoPointValue;

  constructor(readonly internalValue: GeoPoint) {
    super();
  }

  value(): GeoPoint {
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

  approximateByteSize(): number {
    // GeoPoints are made up of two distinct numbers (latitude + longitude)
    return 16;
  }
}

export class ObjectValue extends FieldValue {
  typeOrder = TypeOrder.ObjectValue;

  constructor(readonly internalValue: SortedMap<string, FieldValue>) {
    super();
  }

  /** Returns a new ObjectValueBuilder instance that is based on an empty object. */
  static newBuilder(): ObjectValueBuilder {
    return new ObjectValueBuilder(ObjectValue.EMPTY.internalValue);
  }

  value(): JsonObject<FieldType> {
    const result: JsonObject<FieldType> = {};
    this.internalValue.inorderTraversal((key, val) => {
      result[key] = val.value();
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
        const next1 = it1.getNext();
        const next2 = it2.getNext();
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

  approximateByteSize(): number {
    let size = 0;
    this.internalValue.inorderTraversal((key, val) => {
      size += key.length + val.approximateByteSize();
    });
    return size;
  }

  toString(): string {
    return this.internalValue.toString();
  }

  static EMPTY = new ObjectValue(
    new SortedMap<string, FieldValue>(primitiveComparator)
  );

  /** Creates a ObjectValueBuilder instance that is based on the current value. */
  toBuilder(): ObjectValueBuilder {
    return new ObjectValueBuilder(this.internalValue);
  }
}

/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue. All operations mutate the existing instance.
 */
export class ObjectValueBuilder {
  constructor(private internalValue: SortedMap<string, FieldValue>) {}

  /**
   * Sets the field to the provided value.
   *
   * @param path The field path to set.
   * @param value The value to set.
   * @return The current Builder instance.
   */
  set(path: FieldPath, value: FieldValue): ObjectValueBuilder {
    assert(!path.isEmpty(), 'Cannot set field for empty path on ObjectValue');
    const childName = path.firstSegment();
    if (path.length === 1) {
      this.internalValue = this.internalValue.insert(childName, value);
    } else {
      // nested field
      const child = this.internalValue.get(childName);
      let obj: ObjectValue;
      if (child instanceof ObjectValue) {
        obj = child;
      } else {
        obj = ObjectValue.EMPTY;
      }
      const newChild = obj
        .toBuilder()
        .set(path.popFirst(), value)
        .build();
      this.internalValue = this.internalValue.insert(childName, newChild);
    }
    return this;
  }

  /**
   * Removes the field at the current path. If there is no field at the
   * specified path, nothing is changed.
   *
   * @param path The field path to remove
   * @return The current Builder instance.
   */
  delete(path: FieldPath): ObjectValueBuilder {
    assert(
      !path.isEmpty(),
      'Cannot delete field for empty path on ObjectValue'
    );
    const childName = path.firstSegment();
    if (path.length === 1) {
      this.internalValue = this.internalValue.remove(childName);
    } else {
      // nested field
      const child = this.internalValue.get(childName);
      if (child instanceof ObjectValue) {
        const newChild = child
          .toBuilder()
          .delete(path.popFirst())
          .build();
        this.internalValue = this.internalValue.insert(
          path.firstSegment(),
          newChild
        );
      } else {
        // Don't actually change a primitive value to an object for a delete
      }
    }
    return this;
  }

  build(): ObjectValue {
    return new ObjectValue(this.internalValue);
  }
}

export class ArrayValue extends FieldValue {
  typeOrder = TypeOrder.ArrayValue;

  constructor(readonly internalValue: FieldValue[]) {
    super();
  }

  value(): FieldType[] {
    return this.internalValue.map(v => v.value());
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

  approximateByteSize(): number {
    return this.internalValue.reduce(
      (totalSize, value) => totalSize + value.approximateByteSize(),
      0
    );
  }

  toString(): string {
    const descriptions = this.internalValue.map(v => v.toString());
    return `[${descriptions.join(',')}]`;
  }
}

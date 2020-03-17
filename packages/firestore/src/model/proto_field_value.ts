/**
 * @license
 * Copyright 2020 Google Inc.
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

import { DocumentKey } from './document_key';
import {
  FieldType,
  FieldValue,
  ServerTimestampValue,
  TypeOrder
} from './field_value';
import { FieldPath, ResourcePath } from './path';
import { FieldMask } from './mutation';
import {
  compare,
  equals,
  isType,
  normalizeByteString,
  normalizeTimestamp,
  typeOrder
} from './values';
import { Blob } from '../api/blob';
import { GeoPoint } from '../api/geo_point';
import { Timestamp } from '../api/timestamp';
import { assert, fail } from '../util/assert';
import { forEach } from '../util/obj';
import { SortedSet } from '../util/sorted_set';

/**
 * Represents a FieldValue that is backed by a single Firestore V1 Value proto
 * and implements Firestore's Value semantics for ordering and equality.
 */
export class PrimitiveValue extends FieldValue {
  constructor(public readonly proto: api.Value) {
    super();
  }

  get typeOrder(): number {
    return typeOrder(this.proto);
  }

  value(): FieldType {
    return this.convertValue(this.proto);
  }

  private convertValue(value: api.Value): FieldType {
    if ('nullValue' in value) {
      return null;
    } else if ('booleanValue' in value) {
      return value.booleanValue!;
    } else if ('integerValue' in value) {
      return value.integerValue!;
    } else if ('doubleValue' in value) {
      return value.doubleValue!;
    } else if ('timestampValue' in value) {
      const normalizedTimestamp = normalizeTimestamp(value.timestampValue!);
      return new Timestamp(
        normalizedTimestamp.seconds,
        normalizedTimestamp.nanos
      );
    } else if ('stringValue' in value) {
      return value.stringValue!;
    } else if ('bytesValue' in value) {
      return new Blob(normalizeByteString(value.bytesValue!));
    } else if ('referenceValue' in value) {
      return this.convertReference(value.referenceValue!);
    } else if ('geoPointValue' in value) {
      return new GeoPoint(
        value.geoPointValue!.latitude || 0,
        value.geoPointValue!.longitude || 0
      );
    } else if ('arrayValue' in value) {
      return this.convertArray(value.arrayValue!.values || []);
    } else if ('mapValue' in value) {
      return this.convertMap(value.mapValue!.fields || {});
    } else {
      return fail('Unknown value type: ' + JSON.stringify(value));
    }
  }

  private convertReference(value: string): DocumentKey {
    // TODO(mrschmidt): Move `value()` and `convertValue()` to DocumentSnapshot,
    // which would allow us to validate that the resource name points to the
    // current project.
    const resourceName = ResourcePath.fromString(value);
    assert(
      resourceName.length > 4 && resourceName.get(4) === 'documents',
      'Tried to deserialize invalid key ' + resourceName.toString()
    );
    return new DocumentKey(resourceName.popFirst(5));
  }

  private convertArray(values: api.Value[]): unknown[] {
    return values.map(v => this.convertValue(v));
  }

  private convertMap(
    value: api.ApiClientObjectMap<api.Value>
  ): { [k: string]: unknown } {
    const result: { [k: string]: unknown } = {};
    forEach(value, (k, v) => {
      result[k] = this.convertValue(v);
    });
    return result;
  }

  approximateByteSize(): number {
    // TODO(mrschmidt): Replace JSON stringify with an implementation in ProtoValues
    return JSON.stringify(this.proto).length;
  }

  isEqual(other: FieldValue): boolean {
    if (this === other) {
      return true;
    }
    if (other instanceof PrimitiveValue) {
      return equals(this.proto, other.proto);
    }
    return false;
  }

  compareTo(other: FieldValue): number {
    if (other instanceof PrimitiveValue) {
      return compare(this.proto, other.proto);
    } else if (
      isType(this.proto, TypeOrder.TimestampValue) &&
      other instanceof ServerTimestampValue
    ) {
      // TODO(mrschmidt): Handle timestamps directly in PrimitiveValue
      return -1;
    } else {
      return this.defaultCompareTo(other);
    }
  }
}

/**
 * An ObjectValue represents a MapValue in the Firestore Proto and offers the
 * ability to add and remove fields (via the ObjectValueBuilder).
 */
export class ObjectValue extends PrimitiveValue {
  static EMPTY = new ObjectValue({ mapValue: {} });

  constructor(proto: api.Value) {
    super(proto);
    assert(
      isType(proto, TypeOrder.ObjectValue),
      'ObjectValues must be backed by a MapValue'
    );
  }

  /** Returns a new Builder instance that is based on an empty object. */
  static newBuilder(): ObjectValueBuilder {
    return ObjectValue.EMPTY.toBuilder();
  }

  /**
   * Returns the value at the given path or null.
   *
   * @param path the path to search
   * @return The value at the path or if there it doesn't exist.
   */
  field(path: FieldPath): FieldValue | null {
    if (path.isEmpty()) {
      return this;
    } else {
      let value = this.proto;
      for (let i = 0; i < path.length - 1; ++i) {
        if (!value.mapValue!.fields) {
          return null;
        }
        value = value.mapValue!.fields[path.get(i)];
        if (!isType(value, TypeOrder.ObjectValue)) {
          return null;
        }
      }

      value = (value.mapValue!.fields || {})[path.lastSegment()];
      // TODO(mrschmidt): Simplify/remove
      return isType(value, TypeOrder.ObjectValue)
        ? new ObjectValue(value)
        : value !== undefined
        ? new PrimitiveValue(value)
        : null;
    }
  }

  /**
   * Returns a FieldMask built from all FieldPaths starting from this
   * ObjectValue, including paths from nested objects.
   */
  fieldMask(): FieldMask {
    return this.extractFieldMask(this.proto.mapValue!);
  }

  private extractFieldMask(value: api.MapValue): FieldMask {
    let fields = new SortedSet<FieldPath>(FieldPath.comparator);
    forEach(value.fields || {}, (key, value) => {
      const currentPath = new FieldPath([key]);
      if (isType(value, TypeOrder.ObjectValue)) {
        const nestedMask = this.extractFieldMask(value.mapValue!);
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
        // For nested and non-empty ObjectValues, add the FieldPath of the leaf
        // nodes.
        fields = fields.add(currentPath);
      }
    });
    return FieldMask.fromSet(fields);
  }

  /** Creates a ObjectValueBuilder instance that is based on the current value. */
  toBuilder(): ObjectValueBuilder {
    return new ObjectValueBuilder(this);
  }
}

/**
 * An Overlay, which contains an update to apply. Can either be Value proto, a
 * map of Overlay values (to represent additional nesting at the given key) or
 * `null` (to represent field deletes).
 */
type Overlay = Map<string, Overlay> | api.Value | null;

/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */
export class ObjectValueBuilder {
  /** A map that contains the accumulated changes in this builder. */
  private overlayMap = new Map<string, Overlay>();

  /**
   * @param baseObject The object to mutate.
   */
  constructor(private readonly baseObject: ObjectValue) {}

  /**
   * Sets the field to the provided value.
   *
   * @param path The field path to set.
   * @param value The value to set.
   * @return The current Builder instance.
   */
  set(path: FieldPath, value: api.Value): ObjectValueBuilder {
    assert(!path.isEmpty(), 'Cannot set field for empty path on ObjectValue');
    this.setOverlay(path, value);
    return this;
  }

  /**
   * Removes the field at the specified path. If there is no field at the
   * specified path, nothing is changed.
   *
   * @param path The field path to remove.
   * @return The current Builder instance.
   */
  delete(path: FieldPath): ObjectValueBuilder {
    assert(
      !path.isEmpty(),
      'Cannot delete field for empty path on ObjectValue'
    );
    this.setOverlay(path, null);
    return this;
  }

  /**
   * Adds `value` to the overlay map at `path`. Creates nested map entries if
   * needed.
   */
  private setOverlay(path: FieldPath, value: api.Value | null): void {
    let currentLevel = this.overlayMap;

    for (let i = 0; i < path.length - 1; ++i) {
      const currentSegment = path.get(i);
      let currentValue = currentLevel.get(currentSegment);

      if (currentValue instanceof Map) {
        // Re-use a previously created map
        currentLevel = currentValue;
      } else if (isType(currentValue, TypeOrder.ObjectValue)) {
        // Convert the existing Protobuf MapValue into a map
        currentValue = new Map<string, Overlay>(
          Object.entries(currentValue.mapValue!.fields || {})
        );
        currentLevel.set(currentSegment, currentValue);
        currentLevel = currentValue;
      } else {
        // Create an empty map to represent the current nesting level
        currentValue = new Map<string, Overlay>();
        currentLevel.set(currentSegment, currentValue);
        currentLevel = currentValue;
      }
    }

    currentLevel.set(path.lastSegment(), value);
  }

  /** Returns an ObjectValue with all mutations applied. */
  build(): ObjectValue {
    const mergedResult = this.applyOverlay(
      FieldPath.EMPTY_PATH,
      this.overlayMap
    );
    if (mergedResult != null) {
      return new ObjectValue(mergedResult);
    } else {
      return this.baseObject;
    }
  }

  /**
   * Applies any overlays from `currentOverlays` that exist at `currentPath`
   * and returns the merged data at `currentPath` (or null if there were no
   * changes).
   *
   * @param currentPath The path at the current nesting level. Can be set to
   * FieldValue.EMPTY_PATH to represent the root.
   * @param currentOverlays The overlays at the current nesting level in the
   * same format as `overlayMap`.
   * @return The merged data at `currentPath` or null if no modifications
   * were applied.
   */
  private applyOverlay(
    currentPath: FieldPath,
    currentOverlays: Map<string, Overlay>
  ): api.Value | null {
    let modified = false;

    const existingValue = this.baseObject.field(currentPath);
    const resultAtPath =
      existingValue instanceof ObjectValue
        ? // If there is already data at the current path, base our
          // modifications on top of the existing data.
          { ...existingValue.proto.mapValue!.fields }
        : {};

    currentOverlays.forEach((value, pathSegment) => {
      if (value instanceof Map) {
        const nested = this.applyOverlay(currentPath.child(pathSegment), value);
        if (nested != null) {
          resultAtPath[pathSegment] = nested;
          modified = true;
        }
      } else if (value !== null) {
        resultAtPath[pathSegment] = value;
        modified = true;
      } else if (resultAtPath.hasOwnProperty(pathSegment)) {
        delete resultAtPath[pathSegment];
        modified = true;
      }
    });

    return modified ? { mapValue: { fields: resultAtPath } } : null;
  }
}

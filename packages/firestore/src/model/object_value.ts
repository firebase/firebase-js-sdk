/**
 * @license
 * Copyright 2017 Google LLC
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
import { debugAssert } from '../util/assert';
import { forEach } from '../util/obj';

import { FieldMask } from './mutation';
import { FieldPath } from './path';
import { isServerTimestamp } from './server_timestamps';
import { isMapValue, typeOrder, valueEquals } from './values';

export interface JsonObject<T> {
  [name: string]: T;
}

export const enum TypeOrder {
  // This order is based on the backend's ordering, but modified to support
  // server timestamps.
  NullValue = 0,
  BooleanValue = 1,
  NumberValue = 2,
  TimestampValue = 3,
  ServerTimestampValue = 4,
  StringValue = 5,
  BlobValue = 6,
  RefValue = 7,
  GeoPointValue = 8,
  ArrayValue = 9,
  ObjectValue = 10
}

/**
 * An ObjectValue represents a MapValue in the Firestore Proto and offers the
 * ability to add and remove fields (via the ObjectValueBuilder).
 */
export class ObjectValue {
  constructor(readonly proto: { mapValue: api.MapValue }) {
    debugAssert(
      !isServerTimestamp(proto),
      'ServerTimestamps should be converted to ServerTimestampValue'
    );
  }

  static empty(): ObjectValue {
    return new ObjectValue({ mapValue: {} });
  }

  /**
   * Returns the value at the given path or null.
   *
   * @param path the path to search
   * @return The value at the path or if there it doesn't exist.
   */
  field(path: FieldPath): api.Value | null {
    if (path.isEmpty()) {
      return this.proto;
    } else {
      let value: api.Value = this.proto;
      for (let i = 0; i < path.length - 1; ++i) {
        if (!value.mapValue!.fields) {
          return null;
        }
        value = value.mapValue!.fields[path.get(i)];
        if (!isMapValue(value)) {
          return null;
        }
      }

      value = (value.mapValue!.fields || {})[path.lastSegment()];
      return value || null;
    }
  }

  isEqual(other: ObjectValue): boolean {
    return valueEquals(this.proto, other.proto);
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
  constructor(private readonly baseObject: ObjectValue = ObjectValue.empty()) {}

  /**
   * Sets the field to the provided value.
   *
   * @param path The field path to set.
   * @param value The value to set.
   * @return The current Builder instance.
   */
  set(path: FieldPath, value: api.Value): ObjectValueBuilder {
    debugAssert(
      !path.isEmpty(),
      'Cannot set field for empty path on ObjectValue'
    );
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
    debugAssert(
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
      } else if (
        currentValue &&
        typeOrder(currentValue) === TypeOrder.ObjectValue
      ) {
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
      FieldPath.emptyPath(),
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
   * FieldValue.emptyPath() to represent the root.
   * @param currentOverlays The overlays at the current nesting level in the
   * same format as `overlayMap`.
   * @return The merged data at `currentPath` or null if no modifications
   * were applied.
   */
  private applyOverlay(
    currentPath: FieldPath,
    currentOverlays: Map<string, Overlay>
  ): { mapValue: api.MapValue } | null {
    let modified = false;

    const existingValue = this.baseObject.field(currentPath);
    const resultAtPath = isMapValue(existingValue)
      ? // If there is already data at the current path, base our
        // modifications on top of the existing data.
        { ...existingValue.mapValue.fields }
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

/**
 * Returns a FieldMask built from all fields in a MapValue.
 */
export function extractFieldMask(value: api.MapValue): FieldMask {
  const fields: FieldPath[] = [];
  forEach(value!.fields || {}, (key, value) => {
    const currentPath = new FieldPath([key]);
    if (isMapValue(value)) {
      const nestedMask = extractFieldMask(value.mapValue!);
      const nestedFields = nestedMask.fields;
      if (nestedFields.length === 0) {
        // Preserve the empty map by adding it to the FieldMask.
        fields.push(currentPath);
      } else {
        // For nested and non-empty ObjectValues, add the FieldPath of the
        // leaf nodes.
        for (const nestedPath of nestedFields) {
          fields.push(currentPath.child(nestedPath));
        }
      }
    } else {
      // For nested and non-empty ObjectValues, add the FieldPath of the leaf
      // nodes.
      fields.push(currentPath);
    }
  });
  return new FieldMask(fields);
}

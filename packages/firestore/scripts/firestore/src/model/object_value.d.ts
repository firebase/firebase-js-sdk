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
import { Value as ProtoValue, MapValue as ProtoMapValue } from '../protos/firestore_proto_api';
import { FieldMask } from './mutation';
import { FieldPath } from './path';
export interface JsonObject<T> {
    [name: string]: T;
}
export declare const enum TypeOrder {
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
export declare class ObjectValue {
    readonly proto: {
        mapValue: ProtoMapValue;
    };
    constructor(proto: {
        mapValue: ProtoMapValue;
    });
    static empty(): ObjectValue;
    /**
     * Returns the value at the given path or null.
     *
     * @param path the path to search
     * @return The value at the path or if there it doesn't exist.
     */
    field(path: FieldPath): ProtoValue | null;
    isEqual(other: ObjectValue): boolean;
}
/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */
export declare class ObjectValueBuilder {
    private readonly baseObject;
    /** A map that contains the accumulated changes in this builder. */
    private overlayMap;
    /**
     * @param baseObject The object to mutate.
     */
    constructor(baseObject?: ObjectValue);
    /**
     * Sets the field to the provided value.
     *
     * @param path The field path to set.
     * @param value The value to set.
     * @return The current Builder instance.
     */
    set(path: FieldPath, value: ProtoValue): ObjectValueBuilder;
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path The field path to remove.
     * @return The current Builder instance.
     */
    delete(path: FieldPath): ObjectValueBuilder;
    /**
     * Adds `value` to the overlay map at `path`. Creates nested map entries if
     * needed.
     */
    private setOverlay;
    /** Returns an ObjectValue with all mutations applied. */
    build(): ObjectValue;
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
    private applyOverlay;
}
/**
 * Returns a FieldMask built from all fields in a MapValue.
 */
export declare function extractFieldMask(value: ProtoMapValue): FieldMask;

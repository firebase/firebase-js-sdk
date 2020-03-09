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

import { SnapshotVersion } from '../core/snapshot_version';
import { assert, fail } from '../util/assert';

import { DocumentKey } from './document_key';
import { FieldValue, JsonObject, ObjectValue } from './field_value';
import { FieldPath } from './path';

import * as api from '../protos/firestore_proto_api';
import * as obj from '../util/obj';

export interface DocumentOptions {
  hasLocalMutations?: boolean;
  hasCommittedMutations?: boolean;
}

/**
 * The result of a lookup for a given path may be an existing document or a
 * marker that this document does not exist at a given version.
 */
export abstract class MaybeDocument {
  constructor(readonly key: DocumentKey, readonly version: SnapshotVersion) {}

  static compareByKey(d1: MaybeDocument, d2: MaybeDocument): number {
    return DocumentKey.comparator(d1.key, d2.key);
  }

  /**
   * Whether this document had a local mutation applied that has not yet been
   * acknowledged by Watch.
   */
  abstract get hasPendingWrites(): boolean;

  abstract isEqual(other: MaybeDocument | null | undefined): boolean;

  abstract toString(): string;
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */
export class Document extends MaybeDocument {
  readonly hasLocalMutations: boolean;
  readonly hasCommittedMutations: boolean;

  /**
   * A cache of canonicalized FieldPaths to FieldValues that have already been
   * deserialized in `getField()`.
   */
  private fieldValueCache?: Map<string, FieldValue | null>;

  constructor(
    key: DocumentKey,
    version: SnapshotVersion,
    options: DocumentOptions,
    private objectValue?: ObjectValue,
    readonly proto?: api.Document,
    private readonly converter?: (value: api.Value) => FieldValue
  ) {
    super(key, version);
    assert(
      this.objectValue !== undefined ||
        (this.proto !== undefined && this.converter !== undefined),
      'If objectValue is not defined, proto and converter need to be set.'
    );

    this.hasLocalMutations = !!options.hasLocalMutations;
    this.hasCommittedMutations = !!options.hasCommittedMutations;
  }

  field(path: FieldPath): FieldValue | null {
    if (this.objectValue) {
      return this.objectValue.field(path);
    } else {
      if (!this.fieldValueCache) {
        // TODO(b/136090445): Remove the cache when `getField` is no longer
        // called during Query ordering.
        this.fieldValueCache = new Map<string, FieldValue>();
      }

      const canonicalPath = path.canonicalString();

      let fieldValue = this.fieldValueCache.get(canonicalPath);

      if (fieldValue === undefined) {
        // Instead of deserializing the full Document proto, we only
        // deserialize the value at the requested field path. This speeds up
        // Query execution as query filters can discard documents based on a
        // single field.
        const protoValue = this.getProtoField(path);
        if (protoValue === undefined) {
          fieldValue = null;
        } else {
          fieldValue = this.converter!(protoValue);
        }
        this.fieldValueCache.set(canonicalPath, fieldValue);
      }

      return fieldValue!;
    }
  }

  data(): ObjectValue {
    if (!this.objectValue) {
      const result = ObjectValue.newBuilder();
      obj.forEach(this.proto!.fields || {}, (key: string, value: api.Value) => {
        result.set(new FieldPath([key]), this.converter!(value));
      });
      this.objectValue = result.build();

      // Once objectValue is computed, values inside the fieldValueCache are no
      // longer accessed.
      this.fieldValueCache = undefined;
    }

    return this.objectValue;
  }

  value(): JsonObject<unknown> {
    return this.data().value();
  }

  isEqual(other: MaybeDocument | null | undefined): boolean {
    return (
      other instanceof Document &&
      this.key.isEqual(other.key) &&
      this.version.isEqual(other.version) &&
      this.hasLocalMutations === other.hasLocalMutations &&
      this.hasCommittedMutations === other.hasCommittedMutations &&
      this.data().isEqual(other.data())
    );
  }

  toString(): string {
    return (
      `Document(${this.key}, ${this.version}, ${this.data().toString()}, ` +
      `{hasLocalMutations: ${this.hasLocalMutations}}), ` +
      `{hasCommittedMutations: ${this.hasCommittedMutations}})`
    );
  }

  get hasPendingWrites(): boolean {
    return this.hasLocalMutations || this.hasCommittedMutations;
  }

  /**
   * Returns the nested Protobuf value for 'path`. Can only be called if
   * `proto` was provided at construction time.
   */
  private getProtoField(path: FieldPath): api.Value | undefined {
    assert(
      this.proto !== undefined,
      'Can only call getProtoField() when proto is defined'
    );

    let protoValue: api.Value | undefined = this.proto!.fields
      ? this.proto!.fields[path.firstSegment()]
      : undefined;
    for (let i = 1; i < path.length; ++i) {
      if (!protoValue || !protoValue.mapValue || !protoValue.mapValue.fields) {
        return undefined;
      }
      protoValue = protoValue.mapValue.fields[path.get(i)];
    }

    return protoValue;
  }

  static compareByField(field: FieldPath, d1: Document, d2: Document): number {
    const v1 = d1.field(field);
    const v2 = d2.field(field);
    if (v1 !== null && v2 !== null) {
      return v1.compareTo(v2);
    } else {
      return fail("Trying to compare documents on fields that don't exist");
    }
  }
}

/**
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 */
export class NoDocument extends MaybeDocument {
  readonly hasCommittedMutations: boolean;

  constructor(
    key: DocumentKey,
    version: SnapshotVersion,
    options?: DocumentOptions
  ) {
    super(key, version);
    this.hasCommittedMutations = !!(options && options.hasCommittedMutations);
  }

  toString(): string {
    return `NoDocument(${this.key}, ${this.version})`;
  }

  get hasPendingWrites(): boolean {
    return this.hasCommittedMutations;
  }

  isEqual(other: MaybeDocument | null | undefined): boolean {
    return (
      other instanceof NoDocument &&
      other.hasCommittedMutations === this.hasCommittedMutations &&
      other.version.isEqual(this.version) &&
      other.key.isEqual(this.key)
    );
  }
}

/**
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */
export class UnknownDocument extends MaybeDocument {
  toString(): string {
    return `UnknownDocument(${this.key}, ${this.version})`;
  }

  get hasPendingWrites(): boolean {
    return true;
  }

  isEqual(other: MaybeDocument | null | undefined): boolean {
    return (
      other instanceof UnknownDocument &&
      other.version.isEqual(this.version) &&
      other.key.isEqual(this.key)
    );
  }
}

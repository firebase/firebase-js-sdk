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

import { SnapshotVersion } from '../core/snapshot_version';
import { debugAssert, fail, hardAssert } from '../util/assert';

import { DocumentKey } from './document_key';
import { ObjectValue, objectValueEquals } from './field_value';
import { FieldPath } from './path';
import { valueCompare } from './values';

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

  abstract toString(): string;
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */
export class Document extends MaybeDocument {
  readonly hasLocalMutations: boolean;
  readonly hasCommittedMutations: boolean;

  constructor(
    key: DocumentKey,
    version: SnapshotVersion,
    private readonly objectValue: ObjectValue,
    options: DocumentOptions
  ) {
    super(key, version);
    this.hasLocalMutations = !!options.hasLocalMutations;
    this.hasCommittedMutations = !!options.hasCommittedMutations;
  }

  field(path: FieldPath): api.Value | null {
    return this.objectValue.field(path);
  }

  data(): ObjectValue {
    return this.objectValue;
  }

  toProto(): { mapValue: api.MapValue } {
    return this.objectValue.proto;
  }

  toString(): string {
    return (
      `Document(${this.key}, ${
        this.version
      }, ${this.objectValue.toString()}, ` +
      `{hasLocalMutations: ${this.hasLocalMutations}}), ` +
      `{hasCommittedMutations: ${this.hasCommittedMutations}})`
    );
  }

  get hasPendingWrites(): boolean {
    return this.hasLocalMutations || this.hasCommittedMutations;
  }
}

export function compareByField(
  field: FieldPath,
  d1: Document,
  d2: Document
): number {
  const v1 = d1.field(field);
  const v2 = d2.field(field);

  debugAssert(v1 !== null && v2 !== null, 'Field is missing from one document');
  return valueCompare(v1, v2);
}

// TODO(mrschmidt): I think this is only ever called with documents
export function maybeDocumentEquals(
  left: MaybeDocument | null | undefined,
  right: MaybeDocument | null | undefined
): boolean {
  if (left === right) {
    return true;
  }
  if (left instanceof Document && right instanceof Document) {
    return (
      left.key.isEqual(right.key) &&
      left.version.isEqual(right.version) &&
      left.hasLocalMutations === right.hasLocalMutations &&
      left.hasCommittedMutations === right.hasCommittedMutations &&
      objectValueEquals(left.data(), right.data())
    );
  }

  if (left instanceof NoDocument && right instanceof NoDocument) {
    return (
      left.key.isEqual(right.key) &&
      left.version.isEqual(right.version) &&
      left.hasCommittedMutations === right.hasCommittedMutations
    );
  }

  if (left instanceof UnknownDocument && right instanceof UnknownDocument) {
    return left.key.isEqual(right.key) && left.version.isEqual(right.version);
  }

  return false;
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
}

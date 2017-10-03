/**
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
import { fail } from '../util/assert';
import { AnyJs } from '../util/misc';

import { DocumentKey } from './document_key';
import { FieldValue, JsonObject, ObjectValue } from './field_value';
import { FieldPath } from './path';

export interface DocumentOptions {
  hasLocalMutations: boolean;
}

export class Document {
  readonly hasLocalMutations: boolean;

  constructor(
    readonly key: DocumentKey,
    readonly version: SnapshotVersion,
    readonly data: ObjectValue,
    options: DocumentOptions
  ) {
    this.hasLocalMutations = options.hasLocalMutations;
  }

  field(path: FieldPath): FieldValue {
    return this.data.field(path);
  }

  fieldValue(path: FieldPath): AnyJs {
    const field = this.field(path);
    return field ? field.value() : undefined;
  }

  value(): JsonObject<AnyJs> {
    return this.data.value();
  }

  equals(other: Document | null | undefined): boolean {
    return (
      other instanceof Document &&
      this.key.equals(other.key) &&
      this.version.equals(other.version) &&
      this.data.equals(other.data) &&
      this.hasLocalMutations === other.hasLocalMutations
    );
  }

  toString(): string {
    return (
      `Document(${this.key}, ${this.version}, ${this.data.toString()}, ` +
      `{hasLocalMutations: ${this.hasLocalMutations}})`
    );
  }

  static compareByKey(d1: MaybeDocument, d2: MaybeDocument): number {
    return DocumentKey.comparator(d1.key, d2.key);
  }

  static compareByField(field: FieldPath, d1: Document, d2: Document): number {
    const v1 = d1.field(field);
    const v2 = d2.field(field);
    if (v1 !== undefined && v2 !== undefined) {
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
export class NoDocument {
  constructor(readonly key: DocumentKey, readonly version: SnapshotVersion) {}

  toString(): string {
    return `NoDocument(${this.key}, ${this.version})`;
  }

  public equals(other: NoDocument): boolean {
    return (
      other && other.version.equals(this.version) && other.key.equals(this.key)
    );
  }

  static compareByKey(d1: MaybeDocument, d2: MaybeDocument): number {
    return DocumentKey.comparator(d1.key, d2.key);
  }
}

/**
 * A union type representing either a full document or a deleted document.
 * The NoDocument is used when it doesn't exist on the server.
 */
export type MaybeDocument = Document | NoDocument;

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
import { fail } from '../util/assert';

import { DocumentKey } from './document_key';
import { FieldValue, JsonObject, ObjectValue } from './field_value';
import { FieldPath } from './path';

import * as api from '../protos/firestore_proto_api';

export interface MissingDocumentOptions {
  hasCommittedMutations?: boolean;
}

export interface DocumentOptions {
  hasLocalMutations?: boolean;
  hasCommittedMutations?: boolean;

  /**
   * Memoized serialized form of the document for optimization purposes (avoids
   * repeated serialization). Might be undefined.
   */
  memoizedProto?: api.Document;
}

/**
 * At a high level, Documents either exist or don't exist. However, when they
 * don't exist there are different reasons why they don't exist and we treat
 * these all differently in the cache.
 */
export enum DocumentType {
  /**
   * A document that is unknown to the client. It doesn't exist locally but
   * may or may not exist on the server.
   */
  UNKNOWN,

  /**
   * A special case of UNKNOWN document whose contents are unknown but that is
   * known to exist on the server. This kind of document comes about when the
   * server accepts an update (i.e. a mutation with a precondition that the
   * document exists) but the client didn't have any base document to which
   * the mutation applied.
   *
   * Note that even though the server considers the document to exist, the
   * client still presents a local view as if it didn't exist. This type exists
   * to allow the client to record the version at which the server said the
   * document did exist, so that we can avoid flickering back to old versions
   * while listening for updates.
   */
  CONTENTS_UNKNOWN,

  /**
   * A document that's definitely known not to exist, either because the server
   * said it was missing or because a local mutation deleted it.
   */
  MISSING,

  /**
   * A document that's known to exist and we know what's inside it.
   */
  EXISTS
}

enum DocumentState {
  /** No mutations applied. Document was sent to us by Watch. */
  SYNCED,

  /**
   * Local mutations applied via the mutation queue. Document is potentially
   * inconsistent.
   */
  LOCAL_MUTATIONS,

  /**
   * Mutations applied based on a write acknowledgment. Document is potentially
   * inconsistent.
   */
  COMMITTED_MUTATIONS
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 *
 *
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 *
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */
export class Document {
  static unknown(key: DocumentKey): Document {
    return new Document(
      DocumentType.UNKNOWN,
      key,
      SnapshotVersion.MIN,
      ObjectValue.EMPTY,
      DocumentState.SYNCED // TODO(wilhuff): could also be LOCAL_MUTATIONS
    );
  }

  static contentsUnknown(key: DocumentKey, version: SnapshotVersion): Document {
    return new Document(
      DocumentType.CONTENTS_UNKNOWN,
      key,
      version,
      ObjectValue.EMPTY,
      DocumentState.COMMITTED_MUTATIONS
    );
  }

  static missing(
    key: DocumentKey,
    version: SnapshotVersion,
    options?: MissingDocumentOptions
  ): Document {
    const state = this.makeDocumentState(options);
    return new Document(
      DocumentType.MISSING,
      key,
      version,
      ObjectValue.EMPTY,
      state
    );
  }

  static existing(
    key: DocumentKey,
    version: SnapshotVersion,
    data: ObjectValue,
    options?: DocumentOptions
  ): Document {
    const state = this.makeDocumentState(options);
    return new Document(DocumentType.EXISTS, key, version, data, state);
  }

  private static makeDocumentState(options?: DocumentOptions): DocumentState {
    if (options !== undefined) {
      if (!!options.hasLocalMutations) {
        return DocumentState.LOCAL_MUTATIONS;
      } else if (!!options.hasCommittedMutations) {
        return DocumentState.COMMITTED_MUTATIONS;
      }
    }

    return DocumentState.SYNCED;
  }

  private constructor(
    readonly type: DocumentType,
    readonly key: DocumentKey,
    readonly version: SnapshotVersion,
    readonly data: ObjectValue,
    readonly documentState: DocumentState,
    /**
     * Memoized serialized form of the document for optimization purposes (avoids repeated
     * serialization). Might be undefined.
     */
    readonly proto?: api.Document
  ) {}

  static compareByKey(d1: Document, d2: Document): number {
    return DocumentKey.comparator(d1.key, d2.key);
  }

  field(path: FieldPath): FieldValue | undefined {
    return this.data.field(path);
  }

  fieldValue(path: FieldPath): unknown {
    const field = this.field(path);
    return field ? field.value() : undefined;
  }

  value(): JsonObject<unknown> {
    return this.data.value();
  }

  isEqual(other: Document | null | undefined): boolean {
    return (
      other instanceof Document &&
      this.key.isEqual(other.key) &&
      this.version.isEqual(other.version) &&
      this.data.isEqual(other.data) &&
      this.hasLocalMutations === other.hasLocalMutations &&
      this.hasCommittedMutations === other.hasCommittedMutations
    );
  }

  toString(): string {
    switch (this.type) {
      case DocumentType.UNKNOWN:
        return `Document(UNKNOWN, ${this.key})`;
      case DocumentType.CONTENTS_UNKNOWN:
        return `Document(CONTENTS_UNKNOWN, ${this.key}, ${this.version})`;
      case DocumentType.MISSING:
        return `Document(MISSING, ${this.key}, ${this.version})`;
      case DocumentType.EXISTS:
        return (
          `Document(${this.key}, ${this.version}, ${this.data.toString()}, ` +
          `documentState=${this.documentState})`
        );
      default:
        return fail('Unknown document type');
    }
  }

  get exists(): boolean {
    return this.type === DocumentType.EXISTS;
  }

  get missing(): boolean {
    return this.type === DocumentType.MISSING;
  }

  get unknown(): boolean {
    return this.type === DocumentType.UNKNOWN;
  }

  /**
   * Returns true if the document is of some definite type: either existing
   * or definitely missing.
   */
  get definite(): boolean {
    return (
      this.type === DocumentType.EXISTS || this.type === DocumentType.MISSING
    );
  }

  get hasLocalMutations(): boolean {
    return this.documentState === DocumentState.LOCAL_MUTATIONS;
  }

  get hasCommittedMutations(): boolean {
    return this.documentState === DocumentState.COMMITTED_MUTATIONS;
  }

  /**
   * Whether this document had a local mutation applied that has not yet been
   * acknowledged by Watch.
   */
  get hasPendingWrites(): boolean {
    return this.hasLocalMutations || this.hasCommittedMutations;
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

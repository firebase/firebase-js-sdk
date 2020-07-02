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

import { BatchId, TargetId } from '../core/types';
import { documentKeySet, DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';
import { primitiveComparator } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

/**
 * A collection of references to a document from some kind of numbered entity
 * (either a target ID or batch ID). As references are added to or removed from
 * the set corresponding events are emitted to a registered garbage collector.
 *
 * Each reference is represented by a DocumentReference object. Each of them
 * contains enough information to uniquely identify the reference. They are all
 * stored primarily in a set sorted by key. A document is considered garbage if
 * there's no references in that set (this can be efficiently checked thanks to
 * sorting by key).
 *
 * ReferenceSet also keeps a secondary set that contains references sorted by
 * IDs. This one is used to efficiently implement removal of all references by
 * some target ID.
 */
export class ReferenceSet {
  // A set of outstanding references to a document sorted by key.
  private refsByKey = new SortedSet(DocReference.compareByKey);

  // A set of outstanding references to a document sorted by target id.
  private refsByTarget = new SortedSet(DocReference.compareByTargetId);

  /** Returns true if the reference set contains no references. */
  isEmpty(): boolean {
    return this.refsByKey.isEmpty();
  }

  /** Adds a reference to the given document key for the given ID. */
  addReference(key: DocumentKey, id: TargetId | BatchId): void {
    const ref = new DocReference(key, id);
    this.refsByKey = this.refsByKey.add(ref);
    this.refsByTarget = this.refsByTarget.add(ref);
  }

  /** Add references to the given document keys for the given ID. */
  addReferences(keys: DocumentKeySet, id: TargetId | BatchId): void {
    keys.forEach(key => this.addReference(key, id));
  }

  /**
   * Removes a reference to the given document key for the given
   * ID.
   */
  removeReference(key: DocumentKey, id: TargetId | BatchId): void {
    this.removeRef(new DocReference(key, id));
  }

  removeReferences(keys: DocumentKeySet, id: TargetId | BatchId): void {
    keys.forEach(key => this.removeReference(key, id));
  }

  /**
   * Clears all references with a given ID. Calls removeRef() for each key
   * removed.
   */
  removeReferencesForId(id: TargetId | BatchId): DocumentKey[] {
    const emptyKey = new DocumentKey(new ResourcePath([]));
    const startRef = new DocReference(emptyKey, id);
    const endRef = new DocReference(emptyKey, id + 1);
    const keys: DocumentKey[] = [];
    this.refsByTarget.forEachInRange([startRef, endRef], ref => {
      this.removeRef(ref);
      keys.push(ref.key);
    });
    return keys;
  }

  removeAllReferences(): void {
    this.refsByKey.forEach(ref => this.removeRef(ref));
  }

  private removeRef(ref: DocReference): void {
    this.refsByKey = this.refsByKey.delete(ref);
    this.refsByTarget = this.refsByTarget.delete(ref);
  }

  referencesForId(id: TargetId | BatchId): DocumentKeySet {
    const emptyKey = new DocumentKey(new ResourcePath([]));
    const startRef = new DocReference(emptyKey, id);
    const endRef = new DocReference(emptyKey, id + 1);
    let keys = documentKeySet();
    this.refsByTarget.forEachInRange([startRef, endRef], ref => {
      keys = keys.add(ref.key);
    });
    return keys;
  }

  containsKey(key: DocumentKey): boolean {
    const ref = new DocReference(key, 0);
    const firstRef = this.refsByKey.firstAfterOrEqual(ref);
    return firstRef !== null && key.isEqual(firstRef.key);
  }
}

export class DocReference {
  constructor(
    public key: DocumentKey,
    public targetOrBatchId: TargetId | BatchId
  ) {}

  /** Compare by key then by ID */
  static compareByKey(left: DocReference, right: DocReference): number {
    return (
      DocumentKey.comparator(left.key, right.key) ||
      primitiveComparator(left.targetOrBatchId, right.targetOrBatchId)
    );
  }

  /** Compare by ID then by key */
  static compareByTargetId(left: DocReference, right: DocReference): number {
    return (
      primitiveComparator(left.targetOrBatchId, right.targetOrBatchId) ||
      DocumentKey.comparator(left.key, right.key)
    );
  }
}

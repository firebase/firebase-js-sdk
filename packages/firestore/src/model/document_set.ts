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

import { SortedMap } from '../util/sorted_map';

import { documentMap } from './collections';
import { Document } from './document';
import { DocumentComparator } from './document_comparator';
import { DocumentKey } from './document_key';

/**
 * DocumentSet is an immutable (copy-on-write) collection that holds documents
 * in order specified by the provided comparator. We always add a document key
 * comparator on top of what is provided to guarantee document equality based on
 * the key.
 */

export class DocumentSet {
  /**
   * Returns an empty copy of the existing DocumentSet, using the same
   * comparator.
   */
  static emptySet(oldSet: DocumentSet): DocumentSet {
    return new DocumentSet(oldSet.comparator);
  }

  private comparator: DocumentComparator;
  private keyedMap: SortedMap<DocumentKey, Document>;
  private sortedSet: SortedMap<Document, null>;

  /** The default ordering is by key if the comparator is omitted */
  constructor(comp?: DocumentComparator) {
    // We are adding document key comparator to the end as it's the only
    // guaranteed unique property of a document.
    if (comp) {
      this.comparator = (d1: Document, d2: Document) =>
        comp(d1, d2) || DocumentKey.comparator(d1.key, d2.key);
    } else {
      this.comparator = (d1: Document, d2: Document) =>
        DocumentKey.comparator(d1.key, d2.key);
    }

    this.keyedMap = documentMap();
    this.sortedSet = new SortedMap<Document, null>(this.comparator);
  }

  has(key: DocumentKey): boolean {
    return this.keyedMap.get(key) != null;
  }

  get(key: DocumentKey): Document | null {
    return this.keyedMap.get(key);
  }

  first(): Document | null {
    return this.sortedSet.minKey();
  }

  last(): Document | null {
    return this.sortedSet.maxKey();
  }

  isEmpty(): boolean {
    return this.sortedSet.isEmpty();
  }

  /**
   * Returns the index of the provided key in the document set, or -1 if the
   * document key is not present in the set;
   */
  indexOf(key: DocumentKey): number {
    const doc = this.keyedMap.get(key);
    return doc ? this.sortedSet.indexOf(doc) : -1;
  }

  get size(): number {
    return this.sortedSet.size;
  }

  /** Iterates documents in order defined by "comparator" */
  forEach(cb: (doc: Document) => void): void {
    this.sortedSet.inorderTraversal((k, _v) => {
      cb(k);
      return false;
    });
  }

  /** Inserts or updates a document with the same key */
  add(doc: Document): DocumentSet {
    // First remove the element if we have it.
    const set = this.delete(doc.key);
    return set.copy(
      set.keyedMap.insert(doc.key, doc),
      set.sortedSet.insert(doc, null)
    );
  }

  /** Deletes a document with a given key */
  delete(key: DocumentKey): DocumentSet {
    const doc = this.get(key);
    if (!doc) {
      return this;
    }

    return this.copy(this.keyedMap.remove(key), this.sortedSet.remove(doc));
  }

  isEqual(other: DocumentSet | null | undefined): boolean {
    if (!(other instanceof DocumentSet)) {
      return false;
    }
    if (this.size !== other.size) {
      return false;
    }

    const thisIt = this.sortedSet.getIterator();
    const otherIt = other.sortedSet.getIterator();
    while (thisIt.hasNext()) {
      const thisDoc = thisIt.getNext().key;
      const otherDoc = otherIt.getNext().key;
      if (!thisDoc.isEqual(otherDoc)) {
        return false;
      }
    }
    return true;
  }

  toString(): string {
    const docStrings: string[] = [];
    this.forEach(doc => {
      docStrings.push(doc.toString());
    });
    if (docStrings.length === 0) {
      return 'DocumentSet ()';
    } else {
      return 'DocumentSet (\n  ' + docStrings.join('  \n') + '\n)';
    }
  }

  private copy(
    keyedMap: SortedMap<DocumentKey, Document>,
    sortedSet: SortedMap<Document, null>
  ): DocumentSet {
    const newSet = new DocumentSet();
    newSet.comparator = this.comparator;
    newSet.keyedMap = keyedMap;
    newSet.sortedSet = sortedSet;
    return newSet;
  }
}

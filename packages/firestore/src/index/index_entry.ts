/**
 * @license
 * Copyright 2022 Google LLC
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

import { isSafariOrWebkit } from '@firebase/util';

import { DbIndexEntry } from '../local/indexeddb_schema';
import { DbIndexEntryKey } from '../local/indexeddb_sentinels';
import { DocumentKey } from '../model/document_key';

/** Represents an index entry saved by the SDK in persisted storage. */
export class IndexEntry {
  constructor(
    readonly _indexId: number,
    readonly _documentKey: DocumentKey,
    readonly _arrayValue: Uint8Array | number[],
    readonly _directionalValue: Uint8Array | number[]
  ) {}

  /**
   * Returns an IndexEntry entry that sorts immediately after the current
   * directional value.
   */
  successor(): IndexEntry {
    const currentLength = this._directionalValue.length;
    const newLength =
      currentLength === 0 || this._directionalValue[currentLength - 1] === 255
        ? currentLength + 1
        : currentLength;

    const successor = new Uint8Array(newLength);
    successor.set(this._directionalValue, 0);
    if (newLength !== currentLength) {
      successor.set([0], this._directionalValue.length);
    } else {
      ++successor[successor.length - 1];
    }

    return new IndexEntry(
      this._indexId,
      this._documentKey,
      this._arrayValue,
      successor
    );
  }

  // Create a representation of the Index Entry as a DbIndexEntry
  dbIndexEntry(
    uid: string,
    orderedDocumentKey: Uint8Array,
    documentKey: DocumentKey
  ): DbIndexEntry {
    return {
      indexId: this._indexId,
      uid, // this.uid,
      arrayValue: indexSafeUint8Array(this._arrayValue),
      directionalValue: indexSafeUint8Array(this._directionalValue),
      orderedDocumentKey: indexSafeUint8Array(orderedDocumentKey), // this.encodeDirectionalKey(fieldIndex, document.key),
      documentKey: documentKey.path.toArray()
    };
  }

  // Create a representation of the Index Entry as a DbIndexEntryKey
  dbIndexEntryKey(
    uid: string,
    orderedDocumentKey: Uint8Array,
    documentKey: DocumentKey
  ): DbIndexEntryKey {
    return [
      this._indexId,
      uid,
      indexSafeUint8Array(this._arrayValue),
      indexSafeUint8Array(this._directionalValue),
      indexSafeUint8Array(orderedDocumentKey),
      documentKey.path.toArray()
    ];
  }
}

export function indexEntryComparator(
  left: IndexEntry,
  right: IndexEntry
): number {
  let cmp = left._indexId - right._indexId;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = compareByteArrays(left._arrayValue, right._arrayValue);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = compareByteArrays(left._directionalValue, right._directionalValue);
  if (cmp !== 0) {
    return cmp;
  }

  return DocumentKey.comparator(left._documentKey, right._documentKey);
}

export function compareByteArrays(
  left: Uint8Array | number[],
  right: Uint8Array | number[]
): number {
  for (let i = 0; i < left.length && i < right.length; ++i) {
    const compare = left[i] - right[i];
    if (compare !== 0) {
      return compare;
    }
  }
  return left.length - right.length;
}

// Create an safe representation of Uint8Array values
// If the browser is detected as Safari or WebKit, then
// the input array will be converted to `number[]`.
// Otherwise, the input array will be returned in its
// original type.
export function indexSafeUint8Array(
  array: Uint8Array | number[]
): Uint8Array | number[] {
  if (isSafariOrWebkit() && !Array.isArray(array)) {
    return Array.from(array);
  }
  return array;
}

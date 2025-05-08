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
import { DbIndexEntryKey, KeySafeBytes } from '../local/indexeddb_sentinels';
import { DocumentKey } from '../model/document_key';

/** Represents an index entry saved by the SDK in persisted storage. */
export class IndexEntry {
  constructor(
    readonly _indexId: number,
    readonly _documentKey: DocumentKey,
    readonly _arrayValue: Uint8Array,
    readonly _directionalValue: Uint8Array
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
      uid,
      arrayValue: encodeKeySafeBytes(this._arrayValue),
      directionalValue: encodeKeySafeBytes(this._directionalValue),
      orderedDocumentKey: encodeKeySafeBytes(orderedDocumentKey),
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
      encodeKeySafeBytes(this._arrayValue),
      encodeKeySafeBytes(this._directionalValue),
      encodeKeySafeBytes(orderedDocumentKey),
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

export function compareByteArrays(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < left.length && i < right.length; ++i) {
    const compare = left[i] - right[i];
    if (compare !== 0) {
      return compare;
    }
  }
  return left.length - right.length;
}

/**
 * Workaround for WebKit bug: https://bugs.webkit.org/show_bug.cgi?id=292721
 * Create a key safe representation of Uint8Array values.
 * If the browser is detected as Safari or WebKit, then
 * the input array will be converted to "sortable byte string".
 * Otherwise, the input array will be returned in its original type.
 */
export function encodeKeySafeBytes(array: Uint8Array): KeySafeBytes {
  if (isSafariOrWebkit() && !Array.isArray(array)) {
    return encodeUint8ArrayToSortableString(array);
  }
  return array;
}

/**
 * Reverts the key safe representation of Uint8Array (created by
 * indexSafeUint8Array) to a normal Uint8Array.
 */
export function decodeKeySafeBytes(input: KeySafeBytes): Uint8Array {
  if (typeof input !== 'string') {
    return input;
  }
  return decodeSortableStringToUint8Array(input);
}

/**
 * Encodes a Uint8Array into a "sortable byte string".
 * A "sortable byte string" sorts in the same order as the Uint8Array.
 * This works because JS string comparison sorts strings based on code points.
 */
function encodeUint8ArrayToSortableString(array: Uint8Array): string {
  let byteString = '';
  for (let i = 0; i < array.length; i++) {
    byteString += String.fromCharCode(array[i]);
  }

  return byteString;
}

/**
 * Decodes a "sortable byte string" back into a Uint8Array.
 * A "sortable byte string" is assumed to be created where each character's
 * Unicode code point directly corresponds to a single byte value (0-255).
 */
function decodeSortableStringToUint8Array(byteString: string): Uint8Array {
  const uint8array = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    uint8array[i] = byteString.charCodeAt(i);
  }

  return uint8array;
}

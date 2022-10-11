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

import { DocumentKey } from '../model/document_key';

/** Represents an index entry saved by the SDK in persisted storage. */
export class IndexEntry {
  constructor(
    readonly indexId: number,
    readonly documentKey: DocumentKey,
    readonly arrayValue: Uint8Array,
    readonly directionalValue: Uint8Array
  ) {}

  /**
   * Returns an IndexEntry entry that sorts immediately after the current
   * directional value.
   */
  successor(): IndexEntry {
    const currentLength = this.directionalValue.length;
    const newLength =
      currentLength === 0 || this.directionalValue[currentLength - 1] === 255
        ? currentLength + 1
        : currentLength;

    const successor = new Uint8Array(newLength);
    successor.set(this.directionalValue, 0);
    if (newLength !== currentLength) {
      successor.set([0], this.directionalValue.length);
    } else {
      ++successor[successor.length - 1];
    }

    return new IndexEntry(
      this.indexId,
      this.documentKey,
      this.arrayValue,
      successor
    );
  }
}

export function indexEntryComparator(
  left: IndexEntry,
  right: IndexEntry
): number {
  let cmp = left.indexId - right.indexId;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = compareByteArrays(left.arrayValue, right.arrayValue);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = compareByteArrays(left.directionalValue, right.directionalValue);
  if (cmp !== 0) {
    return cmp;
  }

  return DocumentKey.comparator(left.documentKey, right.documentKey);
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

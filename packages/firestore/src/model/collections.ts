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
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';

import { TargetId } from '../core/types';
import { primitiveComparator } from '../util/misc';
import { Document } from './document';
import { DocumentKey } from './document_key';

/** Miscellaneous collection types / constants. */

// DC: NOTE: Prior to this refactor, the broadest type typically used was
// MaybeDocumentMap which would contain EXISTS and MISSING documents (ignoring
// the unfortunate UnknownDocument), and UNKNOWN documents would just be omitted
// from the map. NOW DocumentMap is too broad for most usages and we have two
// ways to represent an uncached document: UNKNOWN or missing from the map. We
// end up compensating for this with the getDocument() helper below, which helps
// to re-unifies the two cases.
export type DocumentMap = SortedMap<DocumentKey, Document>;

const EMPTY_DOCUMENT_MAP = new SortedMap<DocumentKey, Document>(
  DocumentKey.comparator
);
export function documentMap(): DocumentMap {
  return EMPTY_DOCUMENT_MAP;
}

/**
 * Any structure that can look up documents by key, where entries that are
 * missing are returned as null.
 */
interface DocumentLookup {
  get(key: DocumentKey): Document | null;
}

export function getDocument(key: DocumentKey, map: DocumentLookup): Document {
  const doc = map.get(key);
  return doc ? doc : Document.unknown(key);
}

export type DocumentSizeEntry = {
  maybeDocument: Document;
  size: number;
};

export type DocumentSizeEntries = {
  maybeDocuments: DocumentMap;
  sizeMap: SortedMap<DocumentKey, number>;
};

export type DocumentVersionMap = SortedMap<DocumentKey, SnapshotVersion>;
const EMPTY_DOCUMENT_VERSION_MAP = new SortedMap<DocumentKey, SnapshotVersion>(
  DocumentKey.comparator
);
export function documentVersionMap(): DocumentVersionMap {
  return EMPTY_DOCUMENT_VERSION_MAP;
}

export type DocumentKeySet = SortedSet<DocumentKey>;
const EMPTY_DOCUMENT_KEY_SET = new SortedSet(DocumentKey.comparator);
export function documentKeySet(...keys: DocumentKey[]): DocumentKeySet {
  let set = EMPTY_DOCUMENT_KEY_SET;
  for (const key of keys) {
    set = set.add(key);
  }
  return set;
}

export type TargetIdSet = SortedSet<TargetId>;
const EMPTY_TARGET_ID_SET = new SortedSet<TargetId>(primitiveComparator);
export function targetIdSet(): SortedSet<TargetId> {
  return EMPTY_TARGET_ID_SET;
}

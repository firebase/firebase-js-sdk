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
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';

import { Document, MaybeDocument } from './document';
import { DocumentKey } from './document_key';

/** Miscellaneous collection types / constants. */

export type MaybeDocumentMap = SortedMap<DocumentKey, MaybeDocument>;
const EMPTY_MAYBE_DOCUMENT_MAP = new SortedMap<DocumentKey, MaybeDocument>(
  DocumentKey.comparator
);
export function maybeDocumentMap(): MaybeDocumentMap {
  return EMPTY_MAYBE_DOCUMENT_MAP;
}

export type DocumentMap = SortedMap<DocumentKey, Document>;
const EMPTY_DOCUMENT_MAP = new SortedMap<DocumentKey, Document>(
  DocumentKey.comparator
);
export function documentMap(): DocumentMap {
  return EMPTY_DOCUMENT_MAP;
}

export type DocumentVersionMap = SortedMap<DocumentKey, SnapshotVersion>;
const EMPTY_DOCUMENT_VERSION_MAP = new SortedMap<DocumentKey, SnapshotVersion>(
  DocumentKey.comparator
);
export function documentVersionMap(): DocumentVersionMap {
  return EMPTY_DOCUMENT_VERSION_MAP;
}

export type DocumentKeySet = SortedSet<DocumentKey>;
const EMPTY_DOCUMENT_KEY_SET = new SortedSet(DocumentKey.comparator);
export function documentKeySet(): DocumentKeySet {
  return EMPTY_DOCUMENT_KEY_SET;
}

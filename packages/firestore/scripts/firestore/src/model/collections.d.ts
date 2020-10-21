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
import { SnapshotVersion } from '../core/snapshot_version';
import { SortedMap } from '../util/sorted_map';
import { SortedSet } from '../util/sorted_set';
import { TargetId } from '../core/types';
import { Document, MaybeDocument } from './document';
import { DocumentKey } from './document_key';
/** Miscellaneous collection types / constants. */
export interface DocumentSizeEntry {
    maybeDocument: MaybeDocument;
    size: number;
}
export declare type MaybeDocumentMap = SortedMap<DocumentKey, MaybeDocument>;
export declare function maybeDocumentMap(): MaybeDocumentMap;
export declare type NullableMaybeDocumentMap = SortedMap<DocumentKey, MaybeDocument | null>;
export declare function nullableMaybeDocumentMap(): NullableMaybeDocumentMap;
export interface DocumentSizeEntries {
    maybeDocuments: NullableMaybeDocumentMap;
    sizeMap: SortedMap<DocumentKey, number>;
}
export declare type DocumentMap = SortedMap<DocumentKey, Document>;
export declare function documentMap(): DocumentMap;
export declare type DocumentVersionMap = SortedMap<DocumentKey, SnapshotVersion>;
export declare function documentVersionMap(): DocumentVersionMap;
export declare type DocumentKeySet = SortedSet<DocumentKey>;
export declare function documentKeySet(...keys: DocumentKey[]): DocumentKeySet;
export declare type TargetIdSet = SortedSet<TargetId>;
export declare function targetIdSet(): SortedSet<TargetId>;

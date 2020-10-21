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
import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { Persistence } from '../../../src/local/persistence';
import { RemoteDocumentChangeBuffer } from '../../../src/local/remote_document_change_buffer';
import { DocumentKeySet, DocumentMap, MaybeDocumentMap, NullableMaybeDocumentMap } from '../../../src/model/collections';
import { MaybeDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
/**
 * A wrapper around a RemoteDocumentCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export declare class TestRemoteDocumentCache {
    private readonly persistence;
    private readonly cache;
    constructor(persistence: Persistence);
    /**
     * Reads all of the documents first so we can safely add them and keep the size calculation in
     * sync.
     */
    addEntries(maybeDocuments: MaybeDocument[], readTime: SnapshotVersion): Promise<void>;
    /**
     * Adds a single document using the document's version as its read time.
     * Reads the document first to track the document size internally.
     */
    addEntry(maybeDocument: MaybeDocument): Promise<void>;
    removeEntry(documentKey: DocumentKey, version?: SnapshotVersion): Promise<void>;
    getEntry(documentKey: DocumentKey): Promise<MaybeDocument | null>;
    getEntries(documentKeys: DocumentKeySet): Promise<NullableMaybeDocumentMap>;
    getDocumentsMatchingQuery(query: Query, sinceReadTime: SnapshotVersion): Promise<DocumentMap>;
    getNewDocumentChanges(sinceReadTime: SnapshotVersion): Promise<{
        changedDocs: MaybeDocumentMap;
        readTime: SnapshotVersion;
    }>;
    getSize(): Promise<number>;
    newChangeBuffer(options?: {
        trackRemovals: boolean;
    }): RemoteDocumentChangeBuffer;
}

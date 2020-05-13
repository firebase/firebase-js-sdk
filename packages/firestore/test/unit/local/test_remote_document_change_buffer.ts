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

import { Persistence } from '../../../src/local/persistence';
import { RemoteDocumentChangeBuffer } from '../../../src/local/remote_document_change_buffer';
import { MaybeDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { SnapshotVersion } from '../../../src/core/snapshot_version';

/**
 * A wrapper around a RemoteDocumentChangeBuffer that automatically creates a
 * transaction around operations to reduce test boilerplate.
 */
export class TestRemoteDocumentChangeBuffer {
  constructor(
    public persistence: Persistence,
    public buffer: RemoteDocumentChangeBuffer
  ) {}

  addEntry(maybeDocument: MaybeDocument, readTime: SnapshotVersion): void {
    this.buffer.addEntry(maybeDocument, readTime);
  }

  removeEntry(key: DocumentKey): void {
    this.buffer.removeEntry(key);
  }

  getEntry(documentKey: DocumentKey): Promise<MaybeDocument | null> {
    return this.persistence.runTransaction('getEntry', 'readonly', txn => {
      return this.buffer.getEntry(txn, documentKey);
    });
  }

  apply(): Promise<void> {
    return this.persistence.runTransaction(
      'apply',
      'readwrite-primary',
      txn => {
        return this.buffer.apply(txn);
      }
    );
  }
}

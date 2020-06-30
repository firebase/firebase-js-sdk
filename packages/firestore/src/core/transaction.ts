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

import * as api from '../protos/firestore_proto_api';
import {
  ParsedSetData,
  ParsedUpdateData,
  convertDeleteToWrite,
  convertSetToWrites,
  convertUpdateToWrites,
  convertVerifyToWrite
} from '../api/user_data_reader';
import { Document, MaybeDocument, NoDocument } from '../model/document';

import { DocumentKey } from '../model/document_key';
import { Precondition } from '../model/mutation';
import {
  Datastore,
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc
} from '../remote/datastore';
import { debugAssert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { SnapshotVersion } from './snapshot_version';
import { ResourcePath } from '../model/path';
import { fromName } from '../remote/serializer';

/**
 * Internal transaction object responsible for accumulating the mutations to
 * perform and the base versions for any documents read.
 */
export class Transaction {
  // The version of each document that was read during this transaction.
  private readVersions = new Map</* path */ string, SnapshotVersion>();
  private writes: api.Write[] = [];
  private committed = false;

  /**
   * A deferred usage error that occurred previously in this transaction that
   * will cause the transaction to fail once it actually commits.
   */
  private lastWriteError: FirestoreError | null = null;

  /**
   * Set of documents that have been written in the transaction.
   *
   * When there's more than one write to the same key in a transaction, any
   * writes after the first are handled differently.
   */
  private writtenDocs: Set<string> = new Set();

  constructor(private datastore: Datastore) {}

  async lookup(keys: DocumentKey[]): Promise<MaybeDocument[]> {
    this.ensureCommitNotCalled();

    if (this.writes.length > 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Firestore transactions require all reads to be executed before all writes.'
      );
    }
    const docs = await invokeBatchGetDocumentsRpc(this.datastore, keys);
    docs.forEach(doc => {
      if (doc instanceof NoDocument || doc instanceof Document) {
        this.recordVersion(doc);
      } else {
        fail('Document in a transaction was a ' + doc.constructor.name);
      }
    });
    return docs;
  }

  set(key: DocumentKey, data: ParsedSetData): void {
    this.write(
      convertSetToWrites(
        data,
        this.datastore.serializer,
        key,
        this.precondition(key)
      )
    );
    this.writtenDocs.add(key.toString());
  }

  update(key: DocumentKey, data: ParsedUpdateData): void {
    try {
      this.write(
        convertUpdateToWrites(
          data,
          this.datastore.serializer,
          key,
          this.preconditionForUpdate(key)
        )
      );
    } catch (e) {
      this.lastWriteError = e;
    }
    this.writtenDocs.add(key.toString());
  }

  delete(key: DocumentKey): void {
    this.write([
      convertDeleteToWrite(
        this.datastore.serializer,
        key,
        this.precondition(key)
      )
    ]);
    this.writtenDocs.add(key.toString());
  }

  async commit(): Promise<void> {
    this.ensureCommitNotCalled();

    if (this.lastWriteError) {
      throw this.lastWriteError;
    }
    const unwritten = this.readVersions;
    // For each mutation, note that the doc was written.
    this.writes.forEach(write => {
      const encodedPath = write.update ? write.update.name : write.delete;
      debugAssert(!!encodedPath, 'Expected to find a key');
      const key = fromName(this.datastore.serializer, encodedPath);
      unwritten.delete(key.toString());
    });
    // For each document that was read but not written to, we want to perform
    // a `verify` operation.
    unwritten.forEach((_, path) => {
      const key = new DocumentKey(ResourcePath.fromString(path));
      this.writes.push(
        convertVerifyToWrite(
          this.datastore.serializer,
          key,
          this.precondition(key)
        )
      );
    });
    await invokeCommitRpc(this.datastore, this.writes);
    this.committed = true;
  }

  private recordVersion(doc: MaybeDocument): void {
    let docVersion: SnapshotVersion;

    if (doc instanceof Document) {
      docVersion = doc.version;
    } else if (doc instanceof NoDocument) {
      // For deleted docs, we must use baseVersion 0 when we overwrite them.
      docVersion = SnapshotVersion.min();
    } else {
      throw fail('Document in a transaction was a ' + doc.constructor.name);
    }

    const existingVersion = this.readVersions.get(doc.key.toString());
    if (existingVersion) {
      if (!docVersion.isEqual(existingVersion)) {
        // This transaction will fail no matter what.
        throw new FirestoreError(
          Code.ABORTED,
          'Document version changed between two reads.'
        );
      }
    } else {
      this.readVersions.set(doc.key.toString(), docVersion);
    }
  }

  /**
   * Returns the version of this document when it was read in this transaction,
   * as a precondition, or no precondition if it was not read.
   */
  private precondition(key: DocumentKey): Precondition {
    const version = this.readVersions.get(key.toString());
    if (!this.writtenDocs.has(key.toString()) && version) {
      return Precondition.updateTime(version);
    } else {
      return Precondition.none();
    }
  }

  /**
   * Returns the precondition for a document if the operation is an update.
   */
  private preconditionForUpdate(key: DocumentKey): Precondition {
    const version = this.readVersions.get(key.toString());
    // The first time a document is written, we want to take into account the
    // read time and existence
    if (!this.writtenDocs.has(key.toString()) && version) {
      if (version.isEqual(SnapshotVersion.min())) {
        // The document doesn't exist, so fail the transaction.

        // This has to be validated locally because you can't send a
        // precondition that a document does not exist without changing the
        // semantics of the backend write to be an insert. This is the reverse
        // of what we want, since we want to assert that the document doesn't
        // exist but then send the update and have it fail. Since we can't
        // express that to the backend, we have to validate locally.

        // Note: this can change once we can send separate verify writes in the
        // transaction.
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          "Can't update a document that doesn't exist."
        );
      }
      // Document exists, base precondition on document update time.
      return Precondition.updateTime(version);
    } else {
      // Document was not read, so we just use the preconditions for a blind
      // update.
      return Precondition.exists(true);
    }
  }

  private write(write: api.Write[]): void {
    this.ensureCommitNotCalled();
    this.writes = this.writes.concat(write);
  }

  private ensureCommitNotCalled(): void {
    debugAssert(
      !this.committed,
      'A transaction object cannot be used after its update callback has been invoked.'
    );
  }
}

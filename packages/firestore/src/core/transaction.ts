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

import { ParsedSetData, ParsedUpdateData } from '../api/user_data_converter';
import { documentVersionMap } from '../model/collections';
import { Document, NoDocument, MaybeDocument } from '../model/document';

import { DocumentKey } from '../model/document_key';
import { DeleteMutation, Mutation, Precondition } from '../model/mutation';
import { Datastore } from '../remote/datastore';
import { fail, assert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { SnapshotVersion } from './snapshot_version';

/**
 * Internal transaction object responsible for accumulating the mutations to
 * perform and the base versions for any documents read.
 */
export class Transaction {
  // The version of each document that was read during this transaction.
  private readVersions = documentVersionMap();
  private mutations: Mutation[] = [];
  private committed = false;

  /**
   * A deferred usage error that occurred previously in this transaction that
   * will cause the transaction to fail once it actually commits.
   */
  private lastWriteError: FirestoreError;

  /**
   * Set of documents that have been written in the transaction.
   *
   * When there's more than one write to the same key in a transaction, any
   * writes after hte first are handled differently.
   */
  private writtenDocs: Set<DocumentKey> = new Set();

  constructor(private datastore: Datastore) {}

  lookup(keys: DocumentKey[]): Promise<MaybeDocument[]> {
    this.ensureCommitNotCalled();

    if (this.mutations.length > 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Firestore transactions require all reads to be executed before all writes.'
      );
    }
    return this.datastore.lookup(keys).then(docs => {
      docs.forEach(doc => {
        if (doc instanceof NoDocument || doc instanceof Document) {
          this.recordVersion(doc);
        } else {
          fail('Document in a transaction was a ' + doc.constructor.name);
        }
      });
      return docs;
    });
  }

  set(key: DocumentKey, data: ParsedSetData): void {
    this.write(data.toMutations(key, this.precondition(key)));
    this.writtenDocs.add(key);
  }

  update(key: DocumentKey, data: ParsedUpdateData): void {
    try {
      this.write(data.toMutations(key, this.preconditionForUpdate(key)));
    } catch (e) {
      this.lastWriteError = e;
    }
    this.writtenDocs.add(key);
  }

  delete(key: DocumentKey): void {
    this.write([new DeleteMutation(key, this.precondition(key))]);
    this.writtenDocs.add(key);
  }

  commit(): Promise<void> {
    this.ensureCommitNotCalled();

    if (this.lastWriteError) {
      throw this.lastWriteError;
    }
    let unwritten = this.readVersions;
    // For each mutation, note that the doc was written.
    this.mutations.forEach(mutation => {
      unwritten = unwritten.remove(mutation.key);
    });
    if (!unwritten.isEmpty()) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Every document read in a transaction must also be written.'
      );
    }
    return this.datastore.commit(this.mutations).then(() => {
      this.committed = true;
    });
  }

  private recordVersion(doc: MaybeDocument): void {
    let docVersion: SnapshotVersion;

    if (doc instanceof Document) {
      docVersion = doc.version;
    } else if (doc instanceof NoDocument) {
      // For deleted docs, we must use baseVersion 0 when we overwrite them.
      docVersion = SnapshotVersion.forDeletedDoc();
    } else {
      throw fail('Document in a transaction was a ' + doc.constructor.name);
    }

    const existingVersion = this.readVersions.get(doc.key);
    if (existingVersion !== null) {
      if (!docVersion.isEqual(existingVersion)) {
        // This transaction will fail no matter what.
        throw new FirestoreError(
          Code.ABORTED,
          'Document version changed between two reads.'
        );
      }
    } else {
      this.readVersions = this.readVersions.insert(doc.key, docVersion);
    }
  }

  /**
   * Returns the version of this document when it was read in this transaction,
   * as a precondition, or no precondition if it was not read.
   */
  private precondition(key: DocumentKey): Precondition {
    const version = this.readVersions.get(key);
    if (!this.writtenDocs.has(key) && version) {
      return Precondition.updateTime(version);
    } else {
      return Precondition.NONE;
    }
  }

  /**
   * Returns the precondition for a document if the operation is an update.
   */
  private preconditionForUpdate(key: DocumentKey): Precondition {
    const version = this.readVersions.get(key);
    // The first time a document is written, we want to take into account the
    // read time and existence
    if (!this.writtenDocs.has(key) && version) {
      if (version.isEqual(SnapshotVersion.forDeletedDoc())) {
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

  private write(mutations: Mutation[]): void {
    this.ensureCommitNotCalled();
    this.mutations = this.mutations.concat(mutations);
  }

  private ensureCommitNotCalled(): void {
    assert(
      !this.committed,
      'A transaction object cannot be used after its update callback has been invoked.'
    );
  }
}

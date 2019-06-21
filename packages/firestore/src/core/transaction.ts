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
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { DeleteMutation, Mutation, Precondition } from '../model/mutation';
import { Datastore } from '../remote/datastore';
import { fail } from '../util/assert';
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

  constructor(private datastore: Datastore) {}

  // DC: Type too broad. This should only ever be called with DOCUMENT or
  // MISSING entries, since UNKNOWN would indicate we don't know if the document
  // exists, in which case we cannot record a valid precondition version here.
  private recordVersion(doc: Document): void {
    let docVersion: SnapshotVersion;

    if (doc.exists) {
      docVersion = doc.version;
    } else {
      // DC: This is a bug waiting to happen. Doing this for UNKNOWN documents
      // is wrong. If we want to handle UNKNOWN in this method, we should rename
      // it to tryRecordVersion() and make UNKNOWN be a no-op.

      // For deleted docs, we must use baseVersion 0 when we overwrite them.
      docVersion = SnapshotVersion.forMissingDoc();
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

  // DC: Type may be too broad. This should (and does) only ever return EXISTS
  // or MISSING documents, but you would need to read the code to verify that
  // since the return type is too broad.
  lookup(keys: DocumentKey[]): Promise<Document[]> {
    if (this.committed) {
      return Promise.reject<Document[]>('Transaction has already completed.');
    }
    if (this.mutations.length > 0) {
      return Promise.reject<Document[]>(
        'Transactions lookups are invalid after writes.'
      );
    }
    return this.datastore.lookup(keys).then(docs => {
      docs.forEach(doc => {
        if (doc.definite) {
          this.recordVersion(doc);
        } else {
          fail('Document in a transaction was a ' + doc.toString());
        }
      });
      return docs;
    });
  }

  private write(mutations: Mutation[]): void {
    if (this.committed) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'Transaction has already completed.'
      );
    }
    this.mutations = this.mutations.concat(mutations);
  }

  /**
   * Returns the version of this document when it was read in this transaction,
   * as a precondition, or no precondition if it was not read.
   */
  private precondition(key: DocumentKey): Precondition {
    const version = this.readVersions.get(key);
    if (version) {
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
    if (version && version.isEqual(SnapshotVersion.forMissingDoc())) {
      // The document doesn't exist, so fail the transaction.
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        "Can't update a document that doesn't exist."
      );
    } else if (version) {
      // Document exists, base precondition on document update time.
      return Precondition.updateTime(version);
    } else {
      // Document was not read, so we just use the preconditions for a blind
      // update.
      return Precondition.exists(true);
    }
  }

  set(key: DocumentKey, data: ParsedSetData): void {
    this.write(data.toMutations(key, this.precondition(key)));
  }

  update(key: DocumentKey, data: ParsedUpdateData): void {
    this.write(data.toMutations(key, this.preconditionForUpdate(key)));
  }

  delete(key: DocumentKey): void {
    this.write([new DeleteMutation(key, this.precondition(key))]);
    // Since the delete will be applied before all following writes, we need to
    // ensure that the precondition for the next write will be exists: false.
    this.readVersions = this.readVersions.insert(
      key,
      SnapshotVersion.forMissingDoc()
    );
  }

  commit(): Promise<void> {
    let unwritten = this.readVersions;
    // For each mutation, note that the doc was written.
    this.mutations.forEach(mutation => {
      unwritten = unwritten.remove(mutation.key);
    });
    if (!unwritten.isEmpty()) {
      return Promise.reject(
        Error('Every document read in a transaction must also be written.')
      );
    }
    return this.datastore.commit(this.mutations).then(() => {
      this.committed = true;
    });
  }
}

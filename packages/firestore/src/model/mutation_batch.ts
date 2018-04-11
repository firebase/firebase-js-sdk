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

import { Timestamp } from '../api/timestamp';
import { SnapshotVersion } from '../core/snapshot_version';
import { BatchId, ProtoByteString } from '../core/types';
import {
  documentKeySet,
  DocumentKeySet,
  DocumentVersionMap,
  documentVersionMap
} from './collections';
import { MaybeDocument } from './document';
import { DocumentKey } from './document_key';
import { Mutation, MutationResult } from './mutation';
import { assert } from '../util/assert';
import * as misc from '../util/misc';

export const BATCHID_UNKNOWN = -1;

/**
 * A batch of mutations that will be sent as one unit to the backend.
 */
export class MutationBatch {
  constructor(
    public batchId: BatchId,
    public localWriteTime: Timestamp,
    public mutations: Mutation[]
  ) {}

  /**
   * Applies all the mutations in this MutationBatch to the specified document
   * to create a new remote document
   *
   * @param docKey The key of the document to apply mutations to.
   * @param maybeDoc The document to apply mutations to.
   * @param batchResult The result of applying the MutationBatch to the
   * backend.
   */
  applyToRemoteDocument(
    docKey: DocumentKey,
    maybeDoc: MaybeDocument | null,
    batchResult: MutationBatchResult
  ): MaybeDocument | null {
    if (maybeDoc) {
      assert(
        maybeDoc.key.isEqual(docKey),
        `applyToRemoteDocument: key ${docKey} should match maybeDoc key
        ${maybeDoc.key}`
      );
    }

    const mutationResults = batchResult.mutationResults;
    assert(
      mutationResults.length === this.mutations.length,
      `Mismatch between mutations length
      (${this.mutations.length}) and mutation results length
      (${mutationResults.length}).`
    );

    for (let i = 0; i < this.mutations.length; i++) {
      const mutation = this.mutations[i];
      if (mutation.key.isEqual(docKey)) {
        const mutationResult = mutationResults[i];
        maybeDoc = mutation.applyToRemoteDocument(maybeDoc, mutationResult);
      }
    }
    return maybeDoc;
  }

  /**
   * Computes the local view of a document given all the mutations in this
   * batch.
   *
   * @param docKey The key of the document to apply mutations to.
   * @param maybeDoc The document to apply mutations to.
   */
  applyToLocalView(
    docKey: DocumentKey,
    maybeDoc: MaybeDocument | null
  ): MaybeDocument | null {
    if (maybeDoc) {
      assert(
        maybeDoc.key.isEqual(docKey),
        `applyToLocalDocument: key ${docKey} should match maybeDoc key
        ${maybeDoc.key}`
      );
    }
    const baseDoc = maybeDoc;

    for (let i = 0; i < this.mutations.length; i++) {
      const mutation = this.mutations[i];
      if (mutation.key.isEqual(docKey)) {
        maybeDoc = mutation.applyToLocalView(
          maybeDoc,
          baseDoc,
          this.localWriteTime
        );
      }
    }
    return maybeDoc;
  }

  keys(): DocumentKeySet {
    let keySet = documentKeySet();

    for (const mutation of this.mutations) {
      keySet = keySet.add(mutation.key);
    }
    return keySet;
  }

  isEqual(other: MutationBatch): boolean {
    return (
      this.batchId === other.batchId &&
      misc.arrayEquals(this.mutations, other.mutations)
    );
  }

  /**
   * Returns true if this mutation batch has already been removed from the
   * mutation queue.
   *
   * Note that not all implementations of the MutationQueue necessarily use
   * tombstones as part of their implementation and generally speaking no code
   * outside the mutation queues should really care about this.
   */
  isTombstone(): boolean {
    return this.mutations.length === 0;
  }

  /** Converts this batch into a tombstone */
  toTombstone(): MutationBatch {
    return new MutationBatch(this.batchId, this.localWriteTime, []);
  }
}

/** The result of applying a mutation batch to the backend. */
export class MutationBatchResult {
  private constructor(
    readonly batch: MutationBatch,
    readonly commitVersion: SnapshotVersion,
    readonly mutationResults: MutationResult[],
    readonly streamToken: ProtoByteString,
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    readonly docVersions: DocumentVersionMap
  ) {}

  /**
   * Creates a new MutationBatchResult for the given batch and results. There
   * must be one result for each mutation in the batch. This static factory
   * caches a document=>version mapping (docVersions).
   */
  static from(
    batch: MutationBatch,
    commitVersion: SnapshotVersion,
    results: MutationResult[],
    streamToken: ProtoByteString
  ): MutationBatchResult {
    assert(
      batch.mutations.length === results.length,
      'Mutations sent ' +
        batch.mutations.length +
        ' must equal results received ' +
        results.length
    );

    let versionMap = documentVersionMap();
    const mutations = batch.mutations;
    for (let i = 0; i < mutations.length; i++) {
      let version = results[i].version;
      if (version === null) {
        // deletes don't have a version, so we substitute the commitVersion
        // of the entire batch.
        version = commitVersion;
      }

      versionMap = versionMap.insert(mutations[i].key, version);
    }

    return new MutationBatchResult(
      batch,
      commitVersion,
      results,
      streamToken,
      versionMap
    );
  }
}

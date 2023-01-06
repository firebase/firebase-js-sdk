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
import { BatchId } from '../core/types';
import { Timestamp } from '../lite-api/timestamp';
import { debugAssert, hardAssert } from '../util/assert';
import { arrayEquals } from '../util/misc';

import {
  documentKeySet,
  DocumentKeySet,
  MutationMap,
  DocumentVersionMap,
  documentVersionMap,
  newMutationMap,
  OverlayedDocumentMap
} from './collections';
import { MutableDocument } from './document';
import { FieldMask } from './field_mask';
import {
  calculateOverlayMutation,
  Mutation,
  mutationApplyToLocalView,
  mutationApplyToRemoteDocument,
  mutationEquals,
  MutationResult
} from './mutation';

/**
 * A batch of mutations that will be sent as one unit to the backend.
 */
export class MutationBatch {
  /**
   * @param batchId - The unique ID of this mutation batch.
   * @param localWriteTime - The original write time of this mutation.
   * @param baseMutations - Mutations that are used to populate the base
   * values when this mutation is applied locally. This can be used to locally
   * overwrite values that are persisted in the remote document cache. Base
   * mutations are never sent to the backend.
   * @param mutations - The user-provided mutations in this mutation batch.
   * User-provided mutations are applied both locally and remotely on the
   * backend.
   */
  constructor(
    public batchId: BatchId,
    public localWriteTime: Timestamp,
    public baseMutations: Mutation[],
    public mutations: Mutation[]
  ) {
    debugAssert(mutations.length > 0, 'Cannot create an empty mutation batch');
  }

  /**
   * Applies all the mutations in this MutationBatch to the specified document
   * to compute the state of the remote document
   *
   * @param document - The document to apply mutations to.
   * @param batchResult - The result of applying the MutationBatch to the
   * backend.
   */
  applyToRemoteDocument(
    document: MutableDocument,
    batchResult: MutationBatchResult
  ): void {
    const mutationResults = batchResult.mutationResults;
    debugAssert(
      mutationResults.length === this.mutations.length,
      `Mismatch between mutations length
      (${this.mutations.length}) and mutation results length
      (${mutationResults.length}).`
    );

    for (let i = 0; i < this.mutations.length; i++) {
      const mutation = this.mutations[i];
      if (mutation.key.isEqual(document.key)) {
        const mutationResult = mutationResults[i];
        mutationApplyToRemoteDocument(mutation, document, mutationResult);
      }
    }
  }

  /**
   * Computes the local view of a document given all the mutations in this
   * batch.
   *
   * @param document - The document to apply mutations to.
   * @param mutatedFields - Fields that have been updated before applying this mutation batch.
   * @returns A `FieldMask` representing all the fields that are mutated.
   */
  applyToLocalView(
    document: MutableDocument,
    mutatedFields: FieldMask | null
  ): FieldMask | null {
    // First, apply the base state. This allows us to apply non-idempotent
    // transform against a consistent set of values.
    for (const mutation of this.baseMutations) {
      if (mutation.key.isEqual(document.key)) {
        mutatedFields = mutationApplyToLocalView(
          mutation,
          document,
          mutatedFields,
          this.localWriteTime
        );
      }
    }

    // Second, apply all user-provided mutations.
    for (const mutation of this.mutations) {
      if (mutation.key.isEqual(document.key)) {
        mutatedFields = mutationApplyToLocalView(
          mutation,
          document,
          mutatedFields,
          this.localWriteTime
        );
      }
    }
    return mutatedFields;
  }

  /**
   * Computes the local view for all provided documents given the mutations in
   * this batch. Returns a `DocumentKey` to `Mutation` map which can be used to
   * replace all the mutation applications.
   */
  applyToLocalDocumentSet(
    documentMap: OverlayedDocumentMap,
    documentsWithoutRemoteVersion: DocumentKeySet
  ): MutationMap {
    // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
    // directly (as done in `applyToLocalView()`), we can reduce the complexity
    // to O(n).
    const overlays = newMutationMap();
    this.mutations.forEach(m => {
      const overlayedDocument = documentMap.get(m.key)!;
      // TODO(mutabledocuments): This method should take a MutableDocumentMap
      // and we should remove this cast.
      const mutableDocument =
        overlayedDocument.overlayedDocument as MutableDocument;
      let mutatedFields = this.applyToLocalView(
        mutableDocument,
        overlayedDocument.mutatedFields
      );
      // Set mutatedFields to null if the document is only from local mutations.
      // This creates a Set or Delete mutation, instead of trying to create a
      // patch mutation as the overlay.
      mutatedFields = documentsWithoutRemoteVersion.has(m.key)
        ? null
        : mutatedFields;
      const overlay = calculateOverlayMutation(mutableDocument, mutatedFields);
      if (overlay !== null) {
        overlays.set(m.key, overlay);
      }

      if (!mutableDocument.isValidDocument()) {
        mutableDocument.convertToNoDocument(SnapshotVersion.min());
      }
    });
    return overlays;
  }

  keys(): DocumentKeySet {
    return this.mutations.reduce(
      (keys, m) => keys.add(m.key),
      documentKeySet()
    );
  }

  isEqual(other: MutationBatch): boolean {
    return (
      this.batchId === other.batchId &&
      arrayEquals(this.mutations, other.mutations, (l, r) =>
        mutationEquals(l, r)
      ) &&
      arrayEquals(this.baseMutations, other.baseMutations, (l, r) =>
        mutationEquals(l, r)
      )
    );
  }
}

/** The result of applying a mutation batch to the backend. */
export class MutationBatchResult {
  private constructor(
    readonly batch: MutationBatch,
    readonly commitVersion: SnapshotVersion,
    readonly mutationResults: MutationResult[],
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    readonly docVersions: DocumentVersionMap
  ) {}

  /**
   * Creates a new MutationBatchResult for the given batch and results. There
   * must be one result for each mutation in the batch. This static factory
   * caches a document=&gt;version mapping (docVersions).
   */
  static from(
    batch: MutationBatch,
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ): MutationBatchResult {
    hardAssert(
      batch.mutations.length === results.length,
      'Mutations sent ' +
        batch.mutations.length +
        ' must equal results received ' +
        results.length
    );

    let versionMap = documentVersionMap();
    const mutations = batch.mutations;
    for (let i = 0; i < mutations.length; i++) {
      versionMap = versionMap.insert(mutations[i].key, results[i].version);
    }

    return new MutationBatchResult(batch, commitVersion, results, versionMap);
  }
}

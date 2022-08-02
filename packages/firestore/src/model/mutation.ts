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
import { Timestamp } from '../lite-api/timestamp';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { debugAssert, hardAssert } from '../util/assert';
import { arrayEquals } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

import { Document, MutableDocument } from './document';
import { DocumentKey } from './document_key';
import { FieldMask } from './field_mask';
import { ObjectValue } from './object_value';
import { FieldPath } from './path';
import {
  applyTransformOperationToLocalView,
  applyTransformOperationToRemoteDocument,
  computeTransformOperationBaseValue,
  TransformOperation,
  transformOperationEquals
} from './transform_operation';

/** A field path and the TransformOperation to perform upon it. */
export class FieldTransform {
  constructor(
    readonly field: FieldPath,
    readonly transform: TransformOperation
  ) {}
}

export function fieldTransformEquals(
  left: FieldTransform,
  right: FieldTransform
): boolean {
  return (
    left.field.isEqual(right.field) &&
    transformOperationEquals(left.transform, right.transform)
  );
}

export function fieldTransformsAreEqual(
  left?: FieldTransform[],
  right?: FieldTransform[]
): boolean {
  if (left === undefined && right === undefined) {
    return true;
  }

  if (left && right) {
    return arrayEquals(left, right, (l, r) => fieldTransformEquals(l, r));
  }

  return false;
}

/** The result of successfully applying a mutation to the backend. */
export class MutationResult {
  constructor(
    /**
     * The version at which the mutation was committed:
     *
     * - For most operations, this is the updateTime in the WriteResult.
     * - For deletes, the commitTime of the WriteResponse (because deletes are
     *   not stored and have no updateTime).
     *
     * Note that these versions can be different: No-op writes will not change
     * the updateTime even though the commitTime advances.
     */
    readonly version: SnapshotVersion,
    /**
     * The resulting fields returned from the backend after a mutation
     * containing field transforms has been committed. Contains one FieldValue
     * for each FieldTransform that was in the mutation.
     *
     * Will be empty if the mutation did not contain any field transforms.
     */
    readonly transformResults: Array<ProtoValue | null>
  ) {}
}

export const enum MutationType {
  Set,
  Patch,
  Delete,
  Verify
}

/**
 * Encodes a precondition for a mutation. This follows the model that the
 * backend accepts with the special case of an explicit "empty" precondition
 * (meaning no precondition).
 */
export class Precondition {
  private constructor(
    readonly updateTime?: SnapshotVersion,
    readonly exists?: boolean
  ) {
    debugAssert(
      updateTime === undefined || exists === undefined,
      'Precondition can specify "exists" or "updateTime" but not both'
    );
  }

  /** Creates a new empty Precondition. */
  static none(): Precondition {
    return new Precondition();
  }

  /** Creates a new Precondition with an exists flag. */
  static exists(exists: boolean): Precondition {
    return new Precondition(undefined, exists);
  }

  /** Creates a new Precondition based on a version a document exists at. */
  static updateTime(version: SnapshotVersion): Precondition {
    return new Precondition(version);
  }

  /** Returns whether this Precondition is empty. */
  get isNone(): boolean {
    return this.updateTime === undefined && this.exists === undefined;
  }

  isEqual(other: Precondition): boolean {
    return (
      this.exists === other.exists &&
      (this.updateTime
        ? !!other.updateTime && this.updateTime.isEqual(other.updateTime)
        : !other.updateTime)
    );
  }
}

/** Returns true if the preconditions is valid for the given document. */
export function preconditionIsValidForDocument(
  precondition: Precondition,
  document: MutableDocument
): boolean {
  if (precondition.updateTime !== undefined) {
    return (
      document.isFoundDocument() &&
      document.version.isEqual(precondition.updateTime)
    );
  } else if (precondition.exists !== undefined) {
    return precondition.exists === document.isFoundDocument();
  } else {
    debugAssert(precondition.isNone, 'Precondition should be empty');
    return true;
  }
}

/**
 * A mutation describes a self-contained change to a document. Mutations can
 * create, replace, delete, and update subsets of documents.
 *
 * Mutations not only act on the value of the document but also its version.
 *
 * For local mutations (mutations that haven't been committed yet), we preserve
 * the existing version for Set and Patch mutations. For Delete mutations, we
 * reset the version to 0.
 *
 * Here's the expected transition table.
 *
 * MUTATION           APPLIED TO            RESULTS IN
 *
 * SetMutation        Document(v3)          Document(v3)
 * SetMutation        NoDocument(v3)        Document(v0)
 * SetMutation        InvalidDocument(v0)   Document(v0)
 * PatchMutation      Document(v3)          Document(v3)
 * PatchMutation      NoDocument(v3)        NoDocument(v3)
 * PatchMutation      InvalidDocument(v0)   UnknownDocument(v3)
 * DeleteMutation     Document(v3)          NoDocument(v0)
 * DeleteMutation     NoDocument(v3)        NoDocument(v0)
 * DeleteMutation     InvalidDocument(v0)   NoDocument(v0)
 *
 * For acknowledged mutations, we use the updateTime of the WriteResponse as
 * the resulting version for Set and Patch mutations. As deletes have no
 * explicit update time, we use the commitTime of the WriteResponse for
 * Delete mutations.
 *
 * If a mutation is acknowledged by the backend but fails the precondition check
 * locally, we transition to an `UnknownDocument` and rely on Watch to send us
 * the updated version.
 *
 * Field transforms are used only with Patch and Set Mutations. We use the
 * `updateTransforms` message to store transforms, rather than the `transforms`s
 * messages.
 *
 * ## Subclassing Notes
 *
 * Every type of mutation needs to implement its own applyToRemoteDocument() and
 * applyToLocalView() to implement the actual behavior of applying the mutation
 * to some source document (see `setMutationApplyToRemoteDocument()` for an
 * example).
 */
export abstract class Mutation {
  abstract readonly type: MutationType;
  abstract readonly key: DocumentKey;
  abstract readonly precondition: Precondition;
  abstract readonly fieldTransforms: FieldTransform[];
  /**
   * Returns a `FieldMask` representing the fields that will be changed by
   * applying this mutation. Returns `null` if the mutation will overwrite the
   * entire document.
   */
  abstract getFieldMask(): FieldMask | null;
}

/**
 * A utility method to calculate a `Mutation` representing the overlay from the
 * final state of the document, and a `FieldMask` representing the fields that
 * are mutated by the local mutations.
 */
export function calculateOverlayMutation(
  doc: MutableDocument,
  mask: FieldMask | null
): Mutation | null {
  if (!doc.hasLocalMutations || (mask && mask!.fields.length === 0)) {
    return null;
  }

  // mask is null when sets or deletes are applied to the current document.
  if (mask === null) {
    if (doc.isNoDocument()) {
      return new DeleteMutation(doc.key, Precondition.none());
    } else {
      return new SetMutation(doc.key, doc.data, Precondition.none());
    }
  } else {
    const docValue = doc.data;
    const patchValue = ObjectValue.empty();
    let maskSet = new SortedSet<FieldPath>(FieldPath.comparator);
    for (let path of mask.fields) {
      if (!maskSet.has(path)) {
        let value = docValue.field(path);
        // If we are deleting a nested field, we take the immediate parent as
        // the mask used to construct the resulting mutation.
        // Justification: Nested fields can create parent fields implicitly. If
        // only a leaf entry is deleted in later mutations, the parent field
        // should still remain, but we may have lost this information.
        // Consider mutation (foo.bar 1), then mutation (foo.bar delete()).
        // This leaves the final result (foo, {}). Despite the fact that `doc`
        // has the correct result, `foo` is not in `mask`, and the resulting
        // mutation would miss `foo`.
        if (value === null && path.length > 1) {
          path = path.popLast();
          value = docValue.field(path);
        }
        if (value === null) {
          patchValue.delete(path);
        } else {
          patchValue.set(path, value);
        }
        maskSet = maskSet.add(path);
      }
    }
    return new PatchMutation(
      doc.key,
      patchValue,
      new FieldMask(maskSet.toArray()),
      Precondition.none()
    );
  }
}

/**
 * Applies this mutation to the given document for the purposes of computing a
 * new remote document. If the input document doesn't match the expected state
 * (e.g. it is invalid or outdated), the document type may transition to
 * unknown.
 *
 * @param mutation - The mutation to apply.
 * @param document - The document to mutate. The input document can be an
 *     invalid document if the client has no knowledge of the pre-mutation state
 *     of the document.
 * @param mutationResult - The result of applying the mutation from the backend.
 */
export function mutationApplyToRemoteDocument(
  mutation: Mutation,
  document: MutableDocument,
  mutationResult: MutationResult
): void {
  mutationVerifyKeyMatches(mutation, document);
  if (mutation instanceof SetMutation) {
    setMutationApplyToRemoteDocument(mutation, document, mutationResult);
  } else if (mutation instanceof PatchMutation) {
    patchMutationApplyToRemoteDocument(mutation, document, mutationResult);
  } else {
    debugAssert(
      mutation instanceof DeleteMutation,
      'Unexpected mutation type: ' + mutation
    );
    deleteMutationApplyToRemoteDocument(mutation, document, mutationResult);
  }
}

/**
 * Applies this mutation to the given document for the purposes of computing
 * the new local view of a document. If the input document doesn't match the
 * expected state, the document is not modified.
 *
 * @param mutation - The mutation to apply.
 * @param document - The document to mutate. The input document can be an
 *     invalid document if the client has no knowledge of the pre-mutation state
 *     of the document.
 * @param previousMask - The fields that have been updated before applying this mutation.
 * @param localWriteTime - A timestamp indicating the local write time of the
 *     batch this mutation is a part of.
 * @returns A `FieldMask` representing the fields that are changed by applying this mutation.
 */
export function mutationApplyToLocalView(
  mutation: Mutation,
  document: MutableDocument,
  previousMask: FieldMask | null,
  localWriteTime: Timestamp
): FieldMask | null {
  mutationVerifyKeyMatches(mutation, document);

  if (mutation instanceof SetMutation) {
    return setMutationApplyToLocalView(
      mutation,
      document,
      previousMask,
      localWriteTime
    );
  } else if (mutation instanceof PatchMutation) {
    return patchMutationApplyToLocalView(
      mutation,
      document,
      previousMask,
      localWriteTime
    );
  } else {
    debugAssert(
      mutation instanceof DeleteMutation,
      'Unexpected mutation type: ' + mutation
    );
    return deleteMutationApplyToLocalView(mutation, document, previousMask);
  }
}

/**
 * If this mutation is not idempotent, returns the base value to persist with
 * this mutation. If a base value is returned, the mutation is always applied
 * to this base value, even if document has already been updated.
 *
 * The base value is a sparse object that consists of only the document
 * fields for which this mutation contains a non-idempotent transformation
 * (e.g. a numeric increment). The provided value guarantees consistent
 * behavior for non-idempotent transforms and allow us to return the same
 * latency-compensated value even if the backend has already applied the
 * mutation. The base value is null for idempotent mutations, as they can be
 * re-played even if the backend has already applied them.
 *
 * @returns a base value to store along with the mutation, or null for
 * idempotent mutations.
 */
export function mutationExtractBaseValue(
  mutation: Mutation,
  document: Document
): ObjectValue | null {
  let baseObject: ObjectValue | null = null;
  for (const fieldTransform of mutation.fieldTransforms) {
    const existingValue = document.data.field(fieldTransform.field);
    const coercedValue = computeTransformOperationBaseValue(
      fieldTransform.transform,
      existingValue || null
    );

    if (coercedValue != null) {
      if (baseObject === null) {
        baseObject = ObjectValue.empty();
      }
      baseObject.set(fieldTransform.field, coercedValue);
    }
  }
  return baseObject ? baseObject : null;
}

export function mutationEquals(left: Mutation, right: Mutation): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (!left.key.isEqual(right.key)) {
    return false;
  }

  if (!left.precondition.isEqual(right.precondition)) {
    return false;
  }

  if (!fieldTransformsAreEqual(left.fieldTransforms, right.fieldTransforms)) {
    return false;
  }

  if (left.type === MutationType.Set) {
    return (left as SetMutation).value.isEqual((right as SetMutation).value);
  }

  if (left.type === MutationType.Patch) {
    return (
      (left as PatchMutation).data.isEqual((right as PatchMutation).data) &&
      (left as PatchMutation).fieldMask.isEqual(
        (right as PatchMutation).fieldMask
      )
    );
  }

  return true;
}

function mutationVerifyKeyMatches(
  mutation: Mutation,
  document: MutableDocument
): void {
  debugAssert(
    document.key.isEqual(mutation.key),
    'Can only apply a mutation to a document with the same key'
  );
}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */
export class SetMutation extends Mutation {
  constructor(
    readonly key: DocumentKey,
    readonly value: ObjectValue,
    readonly precondition: Precondition,
    readonly fieldTransforms: FieldTransform[] = []
  ) {
    super();
  }

  readonly type: MutationType = MutationType.Set;

  getFieldMask(): FieldMask | null {
    return null;
  }
}

function setMutationApplyToRemoteDocument(
  mutation: SetMutation,
  document: MutableDocument,
  mutationResult: MutationResult
): void {
  // Unlike setMutationApplyToLocalView, if we're applying a mutation to a
  // remote document the server has accepted the mutation so the precondition
  // must have held.
  const newData = mutation.value.clone();
  const transformResults = serverTransformResults(
    mutation.fieldTransforms,
    document,
    mutationResult.transformResults
  );
  newData.setAll(transformResults);
  document
    .convertToFoundDocument(mutationResult.version, newData)
    .setHasCommittedMutations();
}

function setMutationApplyToLocalView(
  mutation: SetMutation,
  document: MutableDocument,
  previousMask: FieldMask | null,
  localWriteTime: Timestamp
): FieldMask | null {
  if (!preconditionIsValidForDocument(mutation.precondition, document)) {
    // The mutation failed to apply (e.g. a document ID created with add()
    // caused a name collision).
    return previousMask;
  }

  const newData = mutation.value.clone();
  const transformResults = localTransformResults(
    mutation.fieldTransforms,
    localWriteTime,
    document
  );
  newData.setAll(transformResults);
  document
    .convertToFoundDocument(document.version, newData)
    .setHasLocalMutations();
  return null; // SetMutation overwrites all fields.
}

/**
 * A mutation that modifies fields of the document at the given key with the
 * given values. The values are applied through a field mask:
 *
 *  * When a field is in both the mask and the values, the corresponding field
 *    is updated.
 *  * When a field is in neither the mask nor the values, the corresponding
 *    field is unmodified.
 *  * When a field is in the mask but not in the values, the corresponding field
 *    is deleted.
 *  * When a field is not in the mask but is in the values, the values map is
 *    ignored.
 */
export class PatchMutation extends Mutation {
  constructor(
    readonly key: DocumentKey,
    readonly data: ObjectValue,
    readonly fieldMask: FieldMask,
    readonly precondition: Precondition,
    readonly fieldTransforms: FieldTransform[] = []
  ) {
    super();
  }

  readonly type: MutationType = MutationType.Patch;

  getFieldMask(): FieldMask | null {
    return this.fieldMask;
  }
}

function patchMutationApplyToRemoteDocument(
  mutation: PatchMutation,
  document: MutableDocument,
  mutationResult: MutationResult
): void {
  if (!preconditionIsValidForDocument(mutation.precondition, document)) {
    // Since the mutation was not rejected, we know that the precondition
    // matched on the backend. We therefore must not have the expected version
    // of the document in our cache and convert to an UnknownDocument with a
    // known updateTime.
    document.convertToUnknownDocument(mutationResult.version);
    return;
  }

  const transformResults = serverTransformResults(
    mutation.fieldTransforms,
    document,
    mutationResult.transformResults
  );
  const newData = document.data;
  newData.setAll(getPatch(mutation));
  newData.setAll(transformResults);
  document
    .convertToFoundDocument(mutationResult.version, newData)
    .setHasCommittedMutations();
}

function patchMutationApplyToLocalView(
  mutation: PatchMutation,
  document: MutableDocument,
  previousMask: FieldMask | null,
  localWriteTime: Timestamp
): FieldMask | null {
  if (!preconditionIsValidForDocument(mutation.precondition, document)) {
    return previousMask;
  }

  const transformResults = localTransformResults(
    mutation.fieldTransforms,
    localWriteTime,
    document
  );
  const newData = document.data;
  newData.setAll(getPatch(mutation));
  newData.setAll(transformResults);
  document
    .convertToFoundDocument(document.version, newData)
    .setHasLocalMutations();

  if (previousMask === null) {
    return null;
  }

  return previousMask
    .unionWith(mutation.fieldMask.fields)
    .unionWith(mutation.fieldTransforms.map(transform => transform.field));
}

/**
 * Returns a FieldPath/Value map with the content of the PatchMutation.
 */
function getPatch(mutation: PatchMutation): Map<FieldPath, ProtoValue | null> {
  const result = new Map<FieldPath, ProtoValue | null>();
  mutation.fieldMask.fields.forEach(fieldPath => {
    if (!fieldPath.isEmpty()) {
      const newValue = mutation.data.field(fieldPath);
      result.set(fieldPath, newValue);
    }
  });
  return result;
}

/**
 * Creates a list of "transform results" (a transform result is a field value
 * representing the result of applying a transform) for use after a mutation
 * containing transforms has been acknowledged by the server.
 *
 * @param fieldTransforms - The field transforms to apply the result to.
 * @param mutableDocument - The current state of the document after applying all
 * previous mutations.
 * @param serverTransformResults - The transform results received by the server.
 * @returns The transform results list.
 */
function serverTransformResults(
  fieldTransforms: FieldTransform[],
  mutableDocument: MutableDocument,
  serverTransformResults: Array<ProtoValue | null>
): Map<FieldPath, ProtoValue> {
  const transformResults = new Map<FieldPath, ProtoValue>();
  hardAssert(
    fieldTransforms.length === serverTransformResults.length,
    `server transform result count (${serverTransformResults.length}) ` +
      `should match field transform count (${fieldTransforms.length})`
  );

  for (let i = 0; i < serverTransformResults.length; i++) {
    const fieldTransform = fieldTransforms[i];
    const transform = fieldTransform.transform;
    const previousValue = mutableDocument.data.field(fieldTransform.field);
    transformResults.set(
      fieldTransform.field,
      applyTransformOperationToRemoteDocument(
        transform,
        previousValue,
        serverTransformResults[i]
      )
    );
  }
  return transformResults;
}

/**
 * Creates a list of "transform results" (a transform result is a field value
 * representing the result of applying a transform) for use when applying a
 * transform locally.
 *
 * @param fieldTransforms - The field transforms to apply the result to.
 * @param localWriteTime - The local time of the mutation (used to
 *     generate ServerTimestampValues).
 * @param mutableDocument - The document to apply transforms on.
 * @returns The transform results list.
 */
function localTransformResults(
  fieldTransforms: FieldTransform[],
  localWriteTime: Timestamp,
  mutableDocument: MutableDocument
): Map<FieldPath, ProtoValue> {
  const transformResults = new Map<FieldPath, ProtoValue>();
  for (const fieldTransform of fieldTransforms) {
    const transform = fieldTransform.transform;

    const previousValue = mutableDocument.data.field(fieldTransform.field);
    transformResults.set(
      fieldTransform.field,
      applyTransformOperationToLocalView(
        transform,
        previousValue,
        localWriteTime
      )
    );
  }
  return transformResults;
}

/** A mutation that deletes the document at the given key. */
export class DeleteMutation extends Mutation {
  constructor(readonly key: DocumentKey, readonly precondition: Precondition) {
    super();
  }

  readonly type: MutationType = MutationType.Delete;
  readonly fieldTransforms: FieldTransform[] = [];

  getFieldMask(): FieldMask | null {
    return null;
  }
}

function deleteMutationApplyToRemoteDocument(
  mutation: DeleteMutation,
  document: MutableDocument,
  mutationResult: MutationResult
): void {
  debugAssert(
    mutationResult.transformResults.length === 0,
    'Transform results received by DeleteMutation.'
  );

  // Unlike applyToLocalView, if we're applying a mutation to a remote
  // document the server has accepted the mutation so the precondition must
  // have held.
  document
    .convertToNoDocument(mutationResult.version)
    .setHasCommittedMutations();
}

function deleteMutationApplyToLocalView(
  mutation: DeleteMutation,
  document: MutableDocument,
  previousMask: FieldMask | null
): FieldMask | null {
  debugAssert(
    document.key.isEqual(mutation.key),
    'Can only apply mutation to document with same key'
  );
  if (preconditionIsValidForDocument(mutation.precondition, document)) {
    document.convertToNoDocument(document.version).setHasLocalMutations();
    return null;
  }
  return previousMask;
}

/**
 * A mutation that verifies the existence of the document at the given key with
 * the provided precondition.
 *
 * The `verify` operation is only used in Transactions, and this class serves
 * primarily to facilitate serialization into protos.
 */
export class VerifyMutation extends Mutation {
  constructor(readonly key: DocumentKey, readonly precondition: Precondition) {
    super();
  }

  readonly type: MutationType = MutationType.Verify;
  readonly fieldTransforms: FieldTransform[] = [];

  getFieldMask(): FieldMask | null {
    return null;
  }
}

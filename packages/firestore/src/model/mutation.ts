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

import { Timestamp } from '../api/timestamp';
import { SnapshotVersion } from '../core/snapshot_version';
import { debugAssert, hardAssert } from '../util/assert';

import {
  Document,
  MaybeDocument,
  NoDocument,
  UnknownDocument
} from './document';
import { DocumentKey } from './document_key';
import { ObjectValue, ObjectValueBuilder } from './object_value';
import { FieldPath } from './path';
import {
  applyTransformOperationToLocalView,
  applyTransformOperationToRemoteDocument,
  computeTransformOperationBaseValue,
  TransformOperation,
  transformOperationEquals
} from './transform_operation';
import { arrayEquals } from '../util/misc';

/**
 * Provides a set of fields that can be used to partially patch a document.
 * FieldMask is used in conjunction with ObjectValue.
 * Examples:
 *   foo - Overwrites foo entirely with the provided value. If foo is not
 *         present in the companion ObjectValue, the field is deleted.
 *   foo.bar - Overwrites only the field bar of the object foo.
 *             If foo is not an object, foo is replaced with an object
 *             containing foo
 */
export class FieldMask {
  constructor(readonly fields: FieldPath[]) {
    // TODO(dimond): validation of FieldMask
    // Sort the field mask to support `FieldMask.isEqual()` and assert below.
    fields.sort(FieldPath.comparator);
    debugAssert(
      !fields.some((v, i) => i !== 0 && v.isEqual(fields[i - 1])),
      'FieldMask contains field that is not unique: ' +
        fields.find((v, i) => i !== 0 && v.isEqual(fields[i - 1]))!
    );
  }

  /**
   * Verifies that `fieldPath` is included by at least one field in this field
   * mask.
   *
   * This is an O(n) operation, where `n` is the size of the field mask.
   */
  covers(fieldPath: FieldPath): boolean {
    for (const fieldMaskPath of this.fields) {
      if (fieldMaskPath.isPrefixOf(fieldPath)) {
        return true;
      }
    }
    return false;
  }

  isEqual(other: FieldMask): boolean {
    return arrayEquals(this.fields, other.fields, (l, r) => l.isEqual(r));
  }
}

/** A field path and the TransformOperation to perform upon it. */
export class FieldTransform {
  constructor(
    readonly field: FieldPath,
    readonly transform: TransformOperation
  ) {}
}

export function fieldTransformEquals(
  l: FieldTransform,
  r: FieldTransform
): boolean {
  return (
    l.field.isEqual(r.field) &&
    transformOperationEquals(l.transform, r.transform)
  );
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
     * The resulting fields returned from the backend after a
     * TransformMutation has been committed. Contains one FieldValue for each
     * FieldTransform that was in the mutation.
     *
     * Will be null if the mutation was not a TransformMutation.
     */
    readonly transformResults: Array<api.Value | null> | null
  ) {}
}

export const enum MutationType {
  Set,
  Patch,
  Transform,
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

/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */
export function preconditionIsValidForDocument(
  precondition: Precondition,
  maybeDoc: MaybeDocument | null
): boolean {
  if (precondition.updateTime !== undefined) {
    return (
      maybeDoc instanceof Document &&
      maybeDoc.version.isEqual(precondition.updateTime)
    );
  } else if (precondition.exists !== undefined) {
    return precondition.exists === maybeDoc instanceof Document;
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
 * the existing version for Set, Patch, and Transform mutations. For Delete
 * mutations, we reset the version to 0.
 *
 * Here's the expected transition table.
 *
 * MUTATION           APPLIED TO            RESULTS IN
 *
 * SetMutation        Document(v3)          Document(v3)
 * SetMutation        NoDocument(v3)        Document(v0)
 * SetMutation        null                  Document(v0)
 * PatchMutation      Document(v3)          Document(v3)
 * PatchMutation      NoDocument(v3)        NoDocument(v3)
 * PatchMutation      null                  null
 * TransformMutation  Document(v3)          Document(v3)
 * TransformMutation  NoDocument(v3)        NoDocument(v3)
 * TransformMutation  null                  null
 * DeleteMutation     Document(v3)          NoDocument(v0)
 * DeleteMutation     NoDocument(v3)        NoDocument(v0)
 * DeleteMutation     null                  NoDocument(v0)
 *
 * For acknowledged mutations, we use the updateTime of the WriteResponse as
 * the resulting version for Set, Patch, and Transform mutations. As deletes
 * have no explicit update time, we use the commitTime of the WriteResponse for
 * Delete mutations.
 *
 * If a mutation is acknowledged by the backend but fails the precondition check
 * locally, we return an `UnknownDocument` and rely on Watch to send us the
 * updated version.
 *
 * Note that TransformMutations don't create Documents (in the case of being
 * applied to a NoDocument), even though they would on the backend. This is
 * because the client always combines the TransformMutation with a SetMutation
 * or PatchMutation and we only want to apply the transform if the prior
 * mutation resulted in a Document (always true for a SetMutation, but not
 * necessarily for a PatchMutation).
 *
 * ## Subclassing Notes
 *
 * Subclasses of Mutation need to implement applyToRemoteDocument() and
 * applyToLocalView() to implement the actual behavior of applying the mutation
 * to some source document.
 */
export abstract class Mutation {
  abstract readonly type: MutationType;
  abstract readonly key: DocumentKey;
  abstract readonly precondition: Precondition;
}

/**
 * Applies this mutation to the given MaybeDocument or null for the purposes
 * of computing a new remote document. If the input document doesn't match the
 * expected state (e.g. it is null or outdated), an `UnknownDocument` can be
 * returned.
 *
 * @param mutation The mutation to apply.
 * @param maybeDoc The document to mutate. The input document can be null if
 *     the client has no knowledge of the pre-mutation state of the document.
 * @param mutationResult The result of applying the mutation from the backend.
 * @return The mutated document. The returned document may be an
 *     UnknownDocument if the mutation could not be applied to the locally
 *     cached base document.
 */
export function applyMutationToRemoteDocument(
  mutation: Mutation,
  maybeDoc: MaybeDocument | null,
  mutationResult: MutationResult
): MaybeDocument {
  verifyMutationKeyMatches(mutation, maybeDoc);
  if (mutation instanceof SetMutation) {
    return applySetMutationToRemoteDocument(mutation, maybeDoc, mutationResult);
  } else if (mutation instanceof PatchMutation) {
    return applyPatchMutationToRemoteDocument(
      mutation,
      maybeDoc,
      mutationResult
    );
  } else if (mutation instanceof TransformMutation) {
    return applyTransformMutationToRemoteDocument(
      mutation,
      maybeDoc,
      mutationResult
    );
  } else {
    debugAssert(
      mutation instanceof DeleteMutation,
      'Unexpected mutation type: ' + mutation
    );
    return applyDeleteMutationToRemoteDocument(
      mutation,
      maybeDoc,
      mutationResult
    );
  }
}

/**
 * Applies this mutation to the given MaybeDocument or null for the purposes
 * of computing the new local view of a document. Both the input and returned
 * documents can be null.
 *
 * @param mutation The mutation to apply.
 * @param maybeDoc The document to mutate. The input document can be null if
 *     the client has no knowledge of the pre-mutation state of the document.
 * @param baseDoc The state of the document prior to this mutation batch. The
 *     input document can be null if the client has no knowledge of the
 *     pre-mutation state of the document.
 * @param localWriteTime A timestamp indicating the local write time of the
 *     batch this mutation is a part of.
 * @return The mutated document. The returned document may be null, but only
 *     if maybeDoc was null and the mutation would not create a new document.
 */
export function applyMutationToLocalView(
  mutation: Mutation,
  maybeDoc: MaybeDocument | null,
  baseDoc: MaybeDocument | null,
  localWriteTime: Timestamp
): MaybeDocument | null {
  verifyMutationKeyMatches(mutation, maybeDoc);

  if (mutation instanceof SetMutation) {
    return applySetMutationToLocalView(mutation, maybeDoc);
  } else if (mutation instanceof PatchMutation) {
    return applyPatchMutationToLocalView(mutation, maybeDoc);
  } else if (mutation instanceof TransformMutation) {
    return applyTransformMutationToLocalView(
      mutation,
      maybeDoc,
      localWriteTime,
      baseDoc
    );
  } else {
    debugAssert(
      mutation instanceof DeleteMutation,
      'Unexpected mutation type: ' + mutation
    );
    return applyDeleteMutationToLocalView(mutation, maybeDoc);
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
 * @return a base value to store along with the mutation, or null for
 * idempotent mutations.
 */
export function extractMutationBaseValue(
  mutation: Mutation,
  maybeDoc: MaybeDocument | null
): ObjectValue | null {
  if (mutation instanceof TransformMutation) {
    return extractTransformMutationBaseValue(mutation, maybeDoc);
  }
  return null;
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

  if (left.type === MutationType.Transform) {
    return arrayEquals(
      (left as TransformMutation).fieldTransforms,
      (left as TransformMutation).fieldTransforms,
      (l, r) => fieldTransformEquals(l, r)
    );
  }

  return true;
}

function verifyMutationKeyMatches(
  mutation: Mutation,
  maybeDoc: MaybeDocument | null
): void {
  if (maybeDoc != null) {
    debugAssert(
      maybeDoc.key.isEqual(mutation.key),
      'Can only apply a mutation to a document with the same key'
    );
  }
}

/**
 * Returns the version from the given document for use as the result of a
 * mutation. Mutations are defined to return the version of the base document
 * only if it is an existing document. Deleted and unknown documents have a
 * post-mutation version of SnapshotVersion.min().
 */
function getPostMutationVersion(
  maybeDoc: MaybeDocument | null
): SnapshotVersion {
  if (maybeDoc instanceof Document) {
    return maybeDoc.version;
  } else {
    return SnapshotVersion.min();
  }
}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */
export class SetMutation extends Mutation {
  constructor(
    readonly key: DocumentKey,
    readonly value: ObjectValue,
    readonly precondition: Precondition
  ) {
    super();
  }

  readonly type: MutationType = MutationType.Set;
}

function applySetMutationToRemoteDocument(
  mutation: SetMutation,
  maybeDoc: MaybeDocument | null,
  mutationResult: MutationResult
): Document {
  debugAssert(
    mutationResult.transformResults == null,
    'Transform results received by SetMutation.'
  );

  // Unlike applySetMutationToLocalView, if we're applying a mutation to a
  // remote document the server has accepted the mutation so the precondition
  // must have held.
  return new Document(mutation.key, mutationResult.version, mutation.value, {
    hasCommittedMutations: true
  });
}

function applySetMutationToLocalView(
  mutation: SetMutation,
  maybeDoc: MaybeDocument | null
): MaybeDocument | null {
  if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
    return maybeDoc;
  }

  const version = getPostMutationVersion(maybeDoc);
  return new Document(mutation.key, version, mutation.value, {
    hasLocalMutations: true
  });
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
    readonly precondition: Precondition
  ) {
    super();
  }

  readonly type: MutationType = MutationType.Patch;
}

function applyPatchMutationToRemoteDocument(
  mutation: PatchMutation,
  maybeDoc: MaybeDocument | null,
  mutationResult: MutationResult
): MaybeDocument {
  debugAssert(
    mutationResult.transformResults == null,
    'Transform results received by PatchMutation.'
  );

  if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
    // Since the mutation was not rejected, we know that the  precondition
    // matched on the backend. We therefore must not have the expected version
    // of the document in our cache and return an UnknownDocument with the
    // known updateTime.
    return new UnknownDocument(mutation.key, mutationResult.version);
  }

  const newData = patchDocument(mutation, maybeDoc);
  return new Document(mutation.key, mutationResult.version, newData, {
    hasCommittedMutations: true
  });
}

function applyPatchMutationToLocalView(
  mutation: PatchMutation,
  maybeDoc: MaybeDocument | null
): MaybeDocument | null {
  if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
    return maybeDoc;
  }

  const version = getPostMutationVersion(maybeDoc);
  const newData = patchDocument(mutation, maybeDoc);
  return new Document(mutation.key, version, newData, {
    hasLocalMutations: true
  });
}

/**
 * Patches the data of document if available or creates a new document. Note
 * that this does not check whether or not the precondition of this patch
 * holds.
 */
function patchDocument(
  mutation: PatchMutation,
  maybeDoc: MaybeDocument | null
): ObjectValue {
  let data: ObjectValue;
  if (maybeDoc instanceof Document) {
    data = maybeDoc.data();
  } else {
    data = ObjectValue.empty();
  }
  return patchObject(mutation, data);
}

function patchObject(mutation: PatchMutation, data: ObjectValue): ObjectValue {
  const builder = new ObjectValueBuilder(data);
  mutation.fieldMask.fields.forEach(fieldPath => {
    if (!fieldPath.isEmpty()) {
      const newValue = mutation.data.field(fieldPath);
      if (newValue !== null) {
        builder.set(fieldPath, newValue);
      } else {
        builder.delete(fieldPath);
      }
    }
  });
  return builder.build();
}

/**
 * A mutation that modifies specific fields of the document with transform
 * operations. Currently the only supported transform is a server timestamp, but
 * IP Address, increment(n), etc. could be supported in the future.
 *
 * It is somewhat similar to a PatchMutation in that it patches specific fields
 * and has no effect when applied to a null or NoDocument (see comment on
 * Mutation for rationale).
 */
export class TransformMutation extends Mutation {
  readonly type: MutationType = MutationType.Transform;

  // NOTE: We set a precondition of exists: true as a safety-check, since we
  // always combine TransformMutations with a SetMutation or PatchMutation which
  // (if successful) should end up with an existing document.
  readonly precondition = Precondition.exists(true);

  constructor(
    readonly key: DocumentKey,
    readonly fieldTransforms: FieldTransform[]
  ) {
    super();
  }
}

function applyTransformMutationToRemoteDocument(
  mutation: TransformMutation,
  maybeDoc: MaybeDocument | null,
  mutationResult: MutationResult
): Document | UnknownDocument {
  hardAssert(
    mutationResult.transformResults != null,
    'Transform results missing for TransformMutation.'
  );

  if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
    // Since the mutation was not rejected, we know that the  precondition
    // matched on the backend. We therefore must not have the expected version
    // of the document in our cache and return an UnknownDocument with the
    // known updateTime.
    return new UnknownDocument(mutation.key, mutationResult.version);
  }

  const doc = requireDocument(mutation, maybeDoc);
  const transformResults = serverTransformResults(
    mutation.fieldTransforms,
    maybeDoc,
    mutationResult.transformResults!
  );

  const version = mutationResult.version;
  const newData = transformObject(mutation, doc.data(), transformResults);
  return new Document(mutation.key, version, newData, {
    hasCommittedMutations: true
  });
}

function applyTransformMutationToLocalView(
  mutation: TransformMutation,
  maybeDoc: MaybeDocument | null,
  localWriteTime: Timestamp,
  baseDoc: MaybeDocument | null
): MaybeDocument | null {
  if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
    return maybeDoc;
  }

  const doc = requireDocument(mutation, maybeDoc);
  const transformResults = localTransformResults(
    mutation.fieldTransforms,
    localWriteTime,
    maybeDoc,
    baseDoc
  );
  const newData = transformObject(mutation, doc.data(), transformResults);
  return new Document(mutation.key, doc.version, newData, {
    hasLocalMutations: true
  });
}

function extractTransformMutationBaseValue(
  mutation: TransformMutation,
  maybeDoc: MaybeDocument | null | Document
): ObjectValue | null {
  let baseObject: ObjectValueBuilder | null = null;
  for (const fieldTransform of mutation.fieldTransforms) {
    const existingValue =
      maybeDoc instanceof Document
        ? maybeDoc.field(fieldTransform.field)
        : undefined;
    const coercedValue = computeTransformOperationBaseValue(
      fieldTransform.transform,
      existingValue || null
    );

    if (coercedValue != null) {
      if (baseObject == null) {
        baseObject = new ObjectValueBuilder().set(
          fieldTransform.field,
          coercedValue
        );
      } else {
        baseObject = baseObject.set(fieldTransform.field, coercedValue);
      }
    }
  }
  return baseObject ? baseObject.build() : null;
}

/**
 * Asserts that the given MaybeDocument is actually a Document and verifies
 * that it matches the key for this mutation. Since we only support
 * transformations with precondition exists this method is guaranteed to be
 * safe.
 */
function requireDocument(
  mutation: Mutation,
  maybeDoc: MaybeDocument | null
): Document {
  debugAssert(
    maybeDoc instanceof Document,
    'Unknown MaybeDocument type ' + maybeDoc
  );
  debugAssert(
    maybeDoc.key.isEqual(mutation.key),
    'Can only transform a document with the same key'
  );
  return maybeDoc;
}

/**
 * Creates a list of "transform results" (a transform result is a field value
 * representing the result of applying a transform) for use after a
 * TransformMutation has been acknowledged by the server.
 *
 * @param fieldTransforms The field transforms to apply the result to.
 * @param baseDoc The document prior to applying this mutation batch.
 * @param serverTransformResults The transform results received by the server.
 * @return The transform results list.
 */
function serverTransformResults(
  fieldTransforms: FieldTransform[],
  baseDoc: MaybeDocument | null,
  serverTransformResults: Array<api.Value | null>
): api.Value[] {
  const transformResults: api.Value[] = [];
  hardAssert(
    fieldTransforms.length === serverTransformResults.length,
    `server transform result count (${serverTransformResults.length}) ` +
      `should match field transform count (${fieldTransforms.length})`
  );

  for (let i = 0; i < serverTransformResults.length; i++) {
    const fieldTransform = fieldTransforms[i];
    const transform = fieldTransform.transform;
    let previousValue: api.Value | null = null;
    if (baseDoc instanceof Document) {
      previousValue = baseDoc.field(fieldTransform.field);
    }
    transformResults.push(
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
 * TransformMutation locally.
 *
 * @param fieldTransforms The field transforms to apply the result to.
 * @param localWriteTime The local time of the transform mutation (used to
 *     generate ServerTimestampValues).
 * @param maybeDoc The current state of the document after applying all
 *     previous mutations.
 * @param baseDoc The document prior to applying this mutation batch.
 * @return The transform results list.
 */
function localTransformResults(
  fieldTransforms: FieldTransform[],
  localWriteTime: Timestamp,
  maybeDoc: MaybeDocument | null,
  baseDoc: MaybeDocument | null
): api.Value[] {
  const transformResults: api.Value[] = [];
  for (const fieldTransform of fieldTransforms) {
    const transform = fieldTransform.transform;

    let previousValue: api.Value | null = null;
    if (maybeDoc instanceof Document) {
      previousValue = maybeDoc.field(fieldTransform.field);
    }

    if (previousValue === null && baseDoc instanceof Document) {
      // If the current document does not contain a value for the mutated
      // field, use the value that existed before applying this mutation
      // batch. This solves an edge case where a PatchMutation clears the
      // values in a nested map before the TransformMutation is applied.
      previousValue = baseDoc.field(fieldTransform.field);
    }

    transformResults.push(
      applyTransformOperationToLocalView(
        transform,
        previousValue,
        localWriteTime
      )
    );
  }
  return transformResults;
}

function transformObject(
  mutation: TransformMutation,
  data: ObjectValue,
  transformResults: api.Value[]
): ObjectValue {
  debugAssert(
    transformResults.length === mutation.fieldTransforms.length,
    'TransformResults length mismatch.'
  );

  const builder = new ObjectValueBuilder(data);
  for (let i = 0; i < mutation.fieldTransforms.length; i++) {
    const fieldTransform = mutation.fieldTransforms[i];
    builder.set(fieldTransform.field, transformResults[i]);
  }
  return builder.build();
}

/** A mutation that deletes the document at the given key. */
export class DeleteMutation extends Mutation {
  constructor(readonly key: DocumentKey, readonly precondition: Precondition) {
    super();
  }

  readonly type: MutationType = MutationType.Delete;
}

function applyDeleteMutationToRemoteDocument(
  mutation: DeleteMutation,
  maybeDoc: MaybeDocument | null,
  mutationResult: MutationResult
): NoDocument {
  debugAssert(
    mutationResult.transformResults == null,
    'Transform results received by DeleteMutation.'
  );

  // Unlike applyToLocalView, if we're applying a mutation to a remote
  // document the server has accepted the mutation so the precondition must
  // have held.

  return new NoDocument(mutation.key, mutationResult.version, {
    hasCommittedMutations: true
  });
}

function applyDeleteMutationToLocalView(
  mutation: DeleteMutation,
  maybeDoc: MaybeDocument | null
): MaybeDocument | null {
  if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
    return maybeDoc;
  }

  if (maybeDoc) {
    debugAssert(
      maybeDoc.key.isEqual(mutation.key),
      'Can only apply mutation to document with same key'
    );
  }
  return new NoDocument(mutation.key, SnapshotVersion.min());
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
}

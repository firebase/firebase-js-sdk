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
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { Timestamp } from '../api/timestamp';
import { SnapshotVersion } from '../core/snapshot_version';
import { MaybeDocument } from './document';
import { DocumentKey } from './document_key';
import { ObjectValue } from './object_value';
import { FieldPath } from './path';
import { TransformOperation } from './transform_operation';
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
export declare class FieldMask {
    readonly fields: FieldPath[];
    constructor(fields: FieldPath[]);
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */
    covers(fieldPath: FieldPath): boolean;
    isEqual(other: FieldMask): boolean;
}
/** A field path and the TransformOperation to perform upon it. */
export declare class FieldTransform {
    readonly field: FieldPath;
    readonly transform: TransformOperation;
    constructor(field: FieldPath, transform: TransformOperation);
}
export declare function fieldTransformEquals(left: FieldTransform, right: FieldTransform): boolean;
/** The result of successfully applying a mutation to the backend. */
export declare class MutationResult {
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
    readonly version: SnapshotVersion;
    /**
     * The resulting fields returned from the backend after a
     * TransformMutation has been committed. Contains one FieldValue for each
     * FieldTransform that was in the mutation.
     *
     * Will be null if the mutation was not a TransformMutation.
     */
    readonly transformResults: Array<ProtoValue | null> | null;
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
    version: SnapshotVersion, 
    /**
     * The resulting fields returned from the backend after a
     * TransformMutation has been committed. Contains one FieldValue for each
     * FieldTransform that was in the mutation.
     *
     * Will be null if the mutation was not a TransformMutation.
     */
    transformResults: Array<ProtoValue | null> | null);
}
export declare const enum MutationType {
    Set = 0,
    Patch = 1,
    Transform = 2,
    Delete = 3,
    Verify = 4
}
/**
 * Encodes a precondition for a mutation. This follows the model that the
 * backend accepts with the special case of an explicit "empty" precondition
 * (meaning no precondition).
 */
export declare class Precondition {
    readonly updateTime?: SnapshotVersion | undefined;
    readonly exists?: boolean | undefined;
    private constructor();
    /** Creates a new empty Precondition. */
    static none(): Precondition;
    /** Creates a new Precondition with an exists flag. */
    static exists(exists: boolean): Precondition;
    /** Creates a new Precondition based on a version a document exists at. */
    static updateTime(version: SnapshotVersion): Precondition;
    /** Returns whether this Precondition is empty. */
    get isNone(): boolean;
    isEqual(other: Precondition): boolean;
}
/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */
export declare function preconditionIsValidForDocument(precondition: Precondition, maybeDoc: MaybeDocument | null): boolean;
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
export declare abstract class Mutation {
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
export declare function applyMutationToRemoteDocument(mutation: Mutation, maybeDoc: MaybeDocument | null, mutationResult: MutationResult): MaybeDocument;
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
export declare function applyMutationToLocalView(mutation: Mutation, maybeDoc: MaybeDocument | null, baseDoc: MaybeDocument | null, localWriteTime: Timestamp): MaybeDocument | null;
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
export declare function extractMutationBaseValue(mutation: Mutation, maybeDoc: MaybeDocument | null): ObjectValue | null;
export declare function mutationEquals(left: Mutation, right: Mutation): boolean;
/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */
export declare class SetMutation extends Mutation {
    readonly key: DocumentKey;
    readonly value: ObjectValue;
    readonly precondition: Precondition;
    constructor(key: DocumentKey, value: ObjectValue, precondition: Precondition);
    readonly type: MutationType;
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
export declare class PatchMutation extends Mutation {
    readonly key: DocumentKey;
    readonly data: ObjectValue;
    readonly fieldMask: FieldMask;
    readonly precondition: Precondition;
    constructor(key: DocumentKey, data: ObjectValue, fieldMask: FieldMask, precondition: Precondition);
    readonly type: MutationType;
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
export declare class TransformMutation extends Mutation {
    readonly key: DocumentKey;
    readonly fieldTransforms: FieldTransform[];
    readonly type: MutationType;
    readonly precondition: Precondition;
    constructor(key: DocumentKey, fieldTransforms: FieldTransform[]);
}
/** A mutation that deletes the document at the given key. */
export declare class DeleteMutation extends Mutation {
    readonly key: DocumentKey;
    readonly precondition: Precondition;
    constructor(key: DocumentKey, precondition: Precondition);
    readonly type: MutationType;
}
/**
 * A mutation that verifies the existence of the document at the given key with
 * the provided precondition.
 *
 * The `verify` operation is only used in Transactions, and this class serves
 * primarily to facilitate serialization into protos.
 */
export declare class VerifyMutation extends Mutation {
    readonly key: DocumentKey;
    readonly precondition: Precondition;
    constructor(key: DocumentKey, precondition: Precondition);
    readonly type: MutationType;
}

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

import { Blob } from '../api/blob';
import { Timestamp } from '../api/timestamp';
import { DatabaseId } from '../core/database_info';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  LimitType,
  Operator,
  OrderBy,
  Query
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { Target } from '../core/target';
import { TargetId } from '../core/types';
import { TargetData, TargetPurpose } from '../local/target_data';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import {
  DeleteMutation,
  FieldMask,
  FieldTransform,
  Mutation,
  MutationResult,
  PatchMutation,
  Precondition,
  SetMutation,
  TransformMutation,
  VerifyMutation
} from '../model/mutation';
import { ObjectValue } from '../model/object_value';
import { FieldPath, ResourcePath } from '../model/path';
import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation,
  NumericIncrementTransformOperation,
  ServerTimestampTransform,
  TransformOperation
} from '../model/transform_operation';
import { isNanValue, isNullValue, normalizeTimestamp } from '../model/values';
import * as api from '../protos/firestore_proto_api';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { ByteString } from '../util/byte_string';
import { Code, FirestoreError } from '../util/error';
import {
  isNegativeZero,
  isNullOrUndefined,
  isSafeInteger
} from '../util/types';
import { ExistenceFilter } from './existence_filter';
import { mapCodeFromRpcCode } from './rpc_error';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from './watch_change';

const DIRECTIONS = (() => {
  const dirs: { [dir: string]: api.OrderDirection } = {};
  dirs[Direction.ASCENDING] = 'ASCENDING';
  dirs[Direction.DESCENDING] = 'DESCENDING';
  return dirs;
})();

const OPERATORS = (() => {
  const ops: { [op: string]: api.FieldFilterOp } = {};
  ops[Operator.LESS_THAN] = 'LESS_THAN';
  ops[Operator.LESS_THAN_OR_EQUAL] = 'LESS_THAN_OR_EQUAL';
  ops[Operator.GREATER_THAN] = 'GREATER_THAN';
  ops[Operator.GREATER_THAN_OR_EQUAL] = 'GREATER_THAN_OR_EQUAL';
  ops[Operator.EQUAL] = 'EQUAL';
  ops[Operator.ARRAY_CONTAINS] = 'ARRAY_CONTAINS';
  ops[Operator.IN] = 'IN';
  ops[Operator.ARRAY_CONTAINS_ANY] = 'ARRAY_CONTAINS_ANY';
  return ops;
})();

function assertPresent(value: unknown, description: string): asserts value {
  debugAssert(!isNullOrUndefined(value), description + ' is missing');
}

export interface SerializerOptions {
  /**
   * The serializer supports both Protobuf.js and Proto3 JSON formats. By
   * setting this flag to true, the serializer will use the Proto3 JSON format.
   *
   * For a description of the Proto3 JSON format check
   * https://developers.google.com/protocol-buffers/docs/proto3#json
   */
  useProto3Json: boolean;
}

/**
 * Generates JsonObject values for the Datastore API suitable for sending to
 * either GRPC stub methods or via the JSON/HTTP REST API.
 * TODO(klimt): We can remove the databaseId argument if we keep the full
 * resource name in documents.
 */
export class JsonProtoSerializer {
  constructor(
    private databaseId: DatabaseId,
    private options: SerializerOptions
  ) {}

  fromRpcStatus(status: api.Status): FirestoreError {
    const code =
      status.code === undefined
        ? Code.UNKNOWN
        : mapCodeFromRpcCode(status.code);
    return new FirestoreError(code, status.message || '');
  }

  /**
   * Returns a value for a number (or null) that's appropriate to put into
   * a google.protobuf.Int32Value proto.
   * DO NOT USE THIS FOR ANYTHING ELSE.
   * This method cheats. It's typed as returning "number" because that's what
   * our generated proto interfaces say Int32Value must be. But GRPC actually
   * expects a { value: <number> } struct.
   */
  private toInt32Proto(val: number | null): number | { value: number } | null {
    if (this.options.useProto3Json || isNullOrUndefined(val)) {
      return val;
    } else {
      return { value: val };
    }
  }

  /**
   * Returns a number (or null) from a google.protobuf.Int32Value proto.
   */
  private fromInt32Proto(
    val: number | { value: number } | undefined
  ): number | null {
    let result;
    if (typeof val === 'object') {
      result = val.value;
    } else {
      result = val;
    }
    return isNullOrUndefined(result) ? null : result;
  }

  /**
   * Returns an IntegerValue for `value`.
   */
  toInteger(value: number): api.Value {
    return { integerValue: '' + value };
  }

  /**
   * Returns an DoubleValue for `value` that is encoded based the serializer's
   * `useProto3Json` setting.
   */
  toDouble(value: number): api.Value {
    if (this.options.useProto3Json) {
      if (isNaN(value)) {
        return { doubleValue: 'NaN' };
      } else if (value === Infinity) {
        return { doubleValue: 'Infinity' };
      } else if (value === -Infinity) {
        return { doubleValue: '-Infinity' };
      }
    }
    return { doubleValue: isNegativeZero(value) ? '-0' : value };
  }

  /**
   * Returns a value for a number that's appropriate to put into a proto.
   * The return value is an IntegerValue if it can safely represent the value,
   * otherwise a DoubleValue is returned.
   */
  toNumber(value: number): api.Value {
    return isSafeInteger(value) ? this.toInteger(value) : this.toDouble(value);
  }

  /**
   * Returns a value for a Date that's appropriate to put into a proto.
   */
  toTimestamp(timestamp: Timestamp): api.Timestamp {
    if (this.options.useProto3Json) {
      // Serialize to ISO-8601 date format, but with full nano resolution.
      // Since JS Date has only millis, let's only use it for the seconds and
      // then manually add the fractions to the end.
      const jsDateStr = new Date(timestamp.seconds * 1000).toISOString();
      // Remove .xxx frac part and Z in the end.
      const strUntilSeconds = jsDateStr.replace(/\.\d*/, '').replace('Z', '');
      // Pad the fraction out to 9 digits (nanos).
      const nanoStr = ('000000000' + timestamp.nanoseconds).slice(-9);

      return `${strUntilSeconds}.${nanoStr}Z`;
    } else {
      return {
        seconds: '' + timestamp.seconds,
        nanos: timestamp.nanoseconds
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }
  }

  private fromTimestamp(date: api.Timestamp): Timestamp {
    const timestamp = normalizeTimestamp(date);
    return new Timestamp(timestamp.seconds, timestamp.nanos);
  }

  /**
   * Returns a value for bytes that's appropriate to put in a proto.
   *
   * Visible for testing.
   */
  toBytes(bytes: Blob | ByteString): string | Uint8Array {
    if (this.options.useProto3Json) {
      return bytes.toBase64();
    } else {
      return bytes.toUint8Array();
    }
  }

  /**
   * Returns a ByteString based on the proto string value.
   */
  fromBytes(value: string | Uint8Array | undefined): ByteString {
    if (this.options.useProto3Json) {
      hardAssert(
        value === undefined || typeof value === 'string',
        'value must be undefined or a string when using proto3 Json'
      );
      return ByteString.fromBase64String(value ? value : '');
    } else {
      hardAssert(
        value === undefined || value instanceof Uint8Array,
        'value must be undefined or Uint8Array'
      );
      return ByteString.fromUint8Array(value ? value : new Uint8Array());
    }
  }

  toVersion(version: SnapshotVersion): api.Timestamp {
    return this.toTimestamp(version.toTimestamp());
  }

  fromVersion(version: api.Timestamp): SnapshotVersion {
    hardAssert(!!version, "Trying to deserialize version that isn't set");
    return SnapshotVersion.fromTimestamp(this.fromTimestamp(version));
  }

  toResourceName(path: ResourcePath, databaseId?: DatabaseId): string {
    return this.fullyQualifiedPrefixPath(databaseId || this.databaseId)
      .child('documents')
      .child(path)
      .canonicalString();
  }

  fromResourceName(name: string): ResourcePath {
    const resource = ResourcePath.fromString(name);
    hardAssert(
      isValidResourceName(resource),
      'Tried to deserialize invalid key ' + resource.toString()
    );
    return resource;
  }

  toName(key: DocumentKey): string {
    return this.toResourceName(key.path);
  }

  fromName(name: string): DocumentKey {
    const resource = this.fromResourceName(name);
    hardAssert(
      resource.get(1) === this.databaseId.projectId,
      'Tried to deserialize key from different project: ' +
        resource.get(1) +
        ' vs ' +
        this.databaseId.projectId
    );
    hardAssert(
      (!resource.get(3) && !this.databaseId.database) ||
        resource.get(3) === this.databaseId.database,
      'Tried to deserialize key from different database: ' +
        resource.get(3) +
        ' vs ' +
        this.databaseId.database
    );
    return new DocumentKey(this.extractLocalPathFromResourceName(resource));
  }

  toQueryPath(path: ResourcePath): string {
    return this.toResourceName(path);
  }

  fromQueryPath(name: string): ResourcePath {
    const resourceName = this.fromResourceName(name);
    // In v1beta1 queries for collections at the root did not have a trailing
    // "/documents". In v1 all resource paths contain "/documents". Preserve the
    // ability to read the v1beta1 form for compatibility with queries persisted
    // in the local target cache.
    if (resourceName.length === 4) {
      return ResourcePath.EMPTY_PATH;
    }
    return this.extractLocalPathFromResourceName(resourceName);
  }

  get encodedDatabaseId(): string {
    const path = new ResourcePath([
      'projects',
      this.databaseId.projectId,
      'databases',
      this.databaseId.database
    ]);
    return path.canonicalString();
  }

  private fullyQualifiedPrefixPath(databaseId: DatabaseId): ResourcePath {
    return new ResourcePath([
      'projects',
      databaseId.projectId,
      'databases',
      databaseId.database
    ]);
  }

  private extractLocalPathFromResourceName(
    resourceName: ResourcePath
  ): ResourcePath {
    hardAssert(
      resourceName.length > 4 && resourceName.get(4) === 'documents',
      'tried to deserialize invalid key ' + resourceName.toString()
    );
    return resourceName.popFirst(5);
  }

  /** Creates an api.Document from key and fields (but no create/update time) */
  toMutationDocument(key: DocumentKey, fields: ObjectValue): api.Document {
    return {
      name: this.toName(key),
      fields: fields.proto.mapValue.fields
    };
  }

  toDocument(document: Document): api.Document {
    debugAssert(
      !document.hasLocalMutations,
      "Can't serialize documents with mutations."
    );
    return {
      name: this.toName(document.key),
      fields: document.toProto().mapValue.fields,
      updateTime: this.toTimestamp(document.version.toTimestamp())
    };
  }

  fromDocument(
    document: api.Document,
    hasCommittedMutations?: boolean
  ): Document {
    const key = this.fromName(document.name!);
    const version = this.fromVersion(document.updateTime!);
    const data = new ObjectValue({ mapValue: { fields: document.fields } });
    return new Document(key, version, data, {
      hasCommittedMutations: !!hasCommittedMutations
    });
  }

  private fromFound(doc: api.BatchGetDocumentsResponse): Document {
    hardAssert(
      !!doc.found,
      'Tried to deserialize a found document from a missing document.'
    );
    assertPresent(doc.found.name, 'doc.found.name');
    assertPresent(doc.found.updateTime, 'doc.found.updateTime');
    const key = this.fromName(doc.found.name);
    const version = this.fromVersion(doc.found.updateTime);
    const data = new ObjectValue({ mapValue: { fields: doc.found.fields } });
    return new Document(key, version, data, {});
  }

  private fromMissing(result: api.BatchGetDocumentsResponse): NoDocument {
    hardAssert(
      !!result.missing,
      'Tried to deserialize a missing document from a found document.'
    );
    hardAssert(
      !!result.readTime,
      'Tried to deserialize a missing document without a read time.'
    );
    const key = this.fromName(result.missing);
    const version = this.fromVersion(result.readTime);
    return new NoDocument(key, version);
  }

  fromMaybeDocument(result: api.BatchGetDocumentsResponse): MaybeDocument {
    if ('found' in result) {
      return this.fromFound(result);
    } else if ('missing' in result) {
      return this.fromMissing(result);
    }
    return fail('invalid batch get response: ' + JSON.stringify(result));
  }

  fromWatchChange(change: api.ListenResponse): WatchChange {
    let watchChange: WatchChange;
    if ('targetChange' in change) {
      assertPresent(change.targetChange, 'targetChange');
      // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
      // if unset
      const state = this.fromWatchTargetChangeState(
        change.targetChange.targetChangeType || 'NO_CHANGE'
      );
      const targetIds: TargetId[] = change.targetChange.targetIds || [];

      const resumeToken = this.fromBytes(change.targetChange.resumeToken);
      const causeProto = change.targetChange!.cause;
      const cause = causeProto && this.fromRpcStatus(causeProto);
      watchChange = new WatchTargetChange(
        state,
        targetIds,
        resumeToken,
        cause || null
      );
    } else if ('documentChange' in change) {
      assertPresent(change.documentChange, 'documentChange');
      const entityChange = change.documentChange;
      assertPresent(entityChange.document, 'documentChange.name');
      assertPresent(entityChange.document.name, 'documentChange.document.name');
      assertPresent(
        entityChange.document.updateTime,
        'documentChange.document.updateTime'
      );
      const key = this.fromName(entityChange.document.name);
      const version = this.fromVersion(entityChange.document.updateTime);
      const data = new ObjectValue({
        mapValue: { fields: entityChange.document.fields }
      });
      const doc = new Document(key, version, data, {});
      const updatedTargetIds = entityChange.targetIds || [];
      const removedTargetIds = entityChange.removedTargetIds || [];
      watchChange = new DocumentWatchChange(
        updatedTargetIds,
        removedTargetIds,
        doc.key,
        doc
      );
    } else if ('documentDelete' in change) {
      assertPresent(change.documentDelete, 'documentDelete');
      const docDelete = change.documentDelete;
      assertPresent(docDelete.document, 'documentDelete.document');
      const key = this.fromName(docDelete.document);
      const version = docDelete.readTime
        ? this.fromVersion(docDelete.readTime)
        : SnapshotVersion.min();
      const doc = new NoDocument(key, version);
      const removedTargetIds = docDelete.removedTargetIds || [];
      watchChange = new DocumentWatchChange([], removedTargetIds, doc.key, doc);
    } else if ('documentRemove' in change) {
      assertPresent(change.documentRemove, 'documentRemove');
      const docRemove = change.documentRemove;
      assertPresent(docRemove.document, 'documentRemove');
      const key = this.fromName(docRemove.document);
      const removedTargetIds = docRemove.removedTargetIds || [];
      watchChange = new DocumentWatchChange([], removedTargetIds, key, null);
    } else if ('filter' in change) {
      // TODO(dimond): implement existence filter parsing with strategy.
      assertPresent(change.filter, 'filter');
      const filter = change.filter;
      assertPresent(filter.targetId, 'filter.targetId');
      const count = filter.count || 0;
      const existenceFilter = new ExistenceFilter(count);
      const targetId = filter.targetId;
      watchChange = new ExistenceFilterChange(targetId, existenceFilter);
    } else {
      return fail('Unknown change type ' + JSON.stringify(change));
    }
    return watchChange;
  }

  fromWatchTargetChangeState(
    state: api.TargetChangeTargetChangeType
  ): WatchTargetChangeState {
    if (state === 'NO_CHANGE') {
      return WatchTargetChangeState.NoChange;
    } else if (state === 'ADD') {
      return WatchTargetChangeState.Added;
    } else if (state === 'REMOVE') {
      return WatchTargetChangeState.Removed;
    } else if (state === 'CURRENT') {
      return WatchTargetChangeState.Current;
    } else if (state === 'RESET') {
      return WatchTargetChangeState.Reset;
    } else {
      return fail('Got unexpected TargetChange.state: ' + state);
    }
  }

  versionFromListenResponse(change: api.ListenResponse): SnapshotVersion {
    // We have only reached a consistent snapshot for the entire stream if there
    // is a read_time set and it applies to all targets (i.e. the list of
    // targets is empty). The backend is guaranteed to send such responses.
    if (!('targetChange' in change)) {
      return SnapshotVersion.min();
    }
    const targetChange = change.targetChange!;
    if (targetChange.targetIds && targetChange.targetIds.length) {
      return SnapshotVersion.min();
    }
    if (!targetChange.readTime) {
      return SnapshotVersion.min();
    }
    return this.fromVersion(targetChange.readTime);
  }

  toMutation(mutation: Mutation): api.Write {
    let result: api.Write;
    if (mutation instanceof SetMutation) {
      result = {
        update: this.toMutationDocument(mutation.key, mutation.value)
      };
    } else if (mutation instanceof DeleteMutation) {
      result = { delete: this.toName(mutation.key) };
    } else if (mutation instanceof PatchMutation) {
      result = {
        update: this.toMutationDocument(mutation.key, mutation.data),
        updateMask: this.toDocumentMask(mutation.fieldMask)
      };
    } else if (mutation instanceof TransformMutation) {
      result = {
        transform: {
          document: this.toName(mutation.key),
          fieldTransforms: mutation.fieldTransforms.map(transform =>
            this.toFieldTransform(transform)
          )
        }
      };
    } else if (mutation instanceof VerifyMutation) {
      result = {
        verify: this.toName(mutation.key)
      };
    } else {
      return fail('Unknown mutation type ' + mutation.type);
    }

    if (!mutation.precondition.isNone) {
      result.currentDocument = this.toPrecondition(mutation.precondition);
    }

    return result;
  }

  fromMutation(proto: api.Write): Mutation {
    const precondition = proto.currentDocument
      ? this.fromPrecondition(proto.currentDocument)
      : Precondition.none();

    if (proto.update) {
      assertPresent(proto.update.name, 'name');
      const key = this.fromName(proto.update.name);
      const value = new ObjectValue({
        mapValue: { fields: proto.update.fields }
      });
      if (proto.updateMask) {
        const fieldMask = this.fromDocumentMask(proto.updateMask);
        return new PatchMutation(key, value, fieldMask, precondition);
      } else {
        return new SetMutation(key, value, precondition);
      }
    } else if (proto.delete) {
      const key = this.fromName(proto.delete);
      return new DeleteMutation(key, precondition);
    } else if (proto.transform) {
      const key = this.fromName(proto.transform.document!);
      const fieldTransforms = proto.transform.fieldTransforms!.map(transform =>
        this.fromFieldTransform(transform)
      );
      hardAssert(
        precondition.exists === true,
        'Transforms only support precondition "exists == true"'
      );
      return new TransformMutation(key, fieldTransforms);
    } else if (proto.verify) {
      const key = this.fromName(proto.verify);
      return new VerifyMutation(key, precondition);
    } else {
      return fail('unknown mutation proto: ' + JSON.stringify(proto));
    }
  }

  private toPrecondition(precondition: Precondition): api.Precondition {
    debugAssert(!precondition.isNone, "Can't serialize an empty precondition");
    if (precondition.updateTime !== undefined) {
      return {
        updateTime: this.toVersion(precondition.updateTime)
      };
    } else if (precondition.exists !== undefined) {
      return { exists: precondition.exists };
    } else {
      return fail('Unknown precondition');
    }
  }

  private fromPrecondition(precondition: api.Precondition): Precondition {
    if (precondition.updateTime !== undefined) {
      return Precondition.updateTime(this.fromVersion(precondition.updateTime));
    } else if (precondition.exists !== undefined) {
      return Precondition.exists(precondition.exists);
    } else {
      return Precondition.none();
    }
  }

  private fromWriteResult(
    proto: api.WriteResult,
    commitTime: api.Timestamp
  ): MutationResult {
    // NOTE: Deletes don't have an updateTime.
    let version = proto.updateTime
      ? this.fromVersion(proto.updateTime)
      : this.fromVersion(commitTime);

    if (version.isEqual(SnapshotVersion.min())) {
      // The Firestore Emulator currently returns an update time of 0 for
      // deletes of non-existing documents (rather than null). This breaks the
      // test "get deleted doc while offline with source=cache" as NoDocuments
      // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
      // TODO(#2149): Remove this when Emulator is fixed
      version = this.fromVersion(commitTime);
    }

    let transformResults: api.Value[] | null = null;
    if (proto.transformResults && proto.transformResults.length > 0) {
      transformResults = proto.transformResults;
    }
    return new MutationResult(version, transformResults);
  }

  fromWriteResults(
    protos: api.WriteResult[] | undefined,
    commitTime?: api.Timestamp
  ): MutationResult[] {
    if (protos && protos.length > 0) {
      hardAssert(
        commitTime !== undefined,
        'Received a write result without a commit time'
      );
      return protos.map(proto => this.fromWriteResult(proto, commitTime));
    } else {
      return [];
    }
  }

  private toFieldTransform(fieldTransform: FieldTransform): api.FieldTransform {
    const transform = fieldTransform.transform;
    if (transform instanceof ServerTimestampTransform) {
      return {
        fieldPath: fieldTransform.field.canonicalString(),
        setToServerValue: 'REQUEST_TIME'
      };
    } else if (transform instanceof ArrayUnionTransformOperation) {
      return {
        fieldPath: fieldTransform.field.canonicalString(),
        appendMissingElements: {
          values: transform.elements
        }
      };
    } else if (transform instanceof ArrayRemoveTransformOperation) {
      return {
        fieldPath: fieldTransform.field.canonicalString(),
        removeAllFromArray: {
          values: transform.elements
        }
      };
    } else if (transform instanceof NumericIncrementTransformOperation) {
      return {
        fieldPath: fieldTransform.field.canonicalString(),
        increment: transform.operand
      };
    } else {
      throw fail('Unknown transform: ' + fieldTransform.transform);
    }
  }

  private fromFieldTransform(proto: api.FieldTransform): FieldTransform {
    let transform: TransformOperation | null = null;
    if ('setToServerValue' in proto) {
      hardAssert(
        proto.setToServerValue === 'REQUEST_TIME',
        'Unknown server value transform proto: ' + JSON.stringify(proto)
      );
      transform = ServerTimestampTransform.instance;
    } else if ('appendMissingElements' in proto) {
      const values = proto.appendMissingElements!.values || [];
      transform = new ArrayUnionTransformOperation(values);
    } else if ('removeAllFromArray' in proto) {
      const values = proto.removeAllFromArray!.values || [];
      transform = new ArrayRemoveTransformOperation(values);
    } else if ('increment' in proto) {
      transform = new NumericIncrementTransformOperation(
        this,
        proto.increment!
      );
    } else {
      fail('Unknown transform proto: ' + JSON.stringify(proto));
    }
    const fieldPath = FieldPath.fromServerFormat(proto.fieldPath!);
    return new FieldTransform(fieldPath, transform!);
  }

  toDocumentsTarget(target: Target): api.DocumentsTarget {
    return { documents: [this.toQueryPath(target.path)] };
  }

  fromDocumentsTarget(documentsTarget: api.DocumentsTarget): Target {
    const count = documentsTarget.documents!.length;
    hardAssert(
      count === 1,
      'DocumentsTarget contained other than 1 document: ' + count
    );
    const name = documentsTarget.documents![0];
    return Query.atPath(this.fromQueryPath(name)).toTarget();
  }

  toQueryTarget(target: Target): api.QueryTarget {
    // Dissect the path into parent, collectionId, and optional key filter.
    const result: api.QueryTarget = { structuredQuery: {} };
    const path = target.path;
    if (target.collectionGroup !== null) {
      debugAssert(
        path.length % 2 === 0,
        'Collection Group queries should be within a document path or root.'
      );
      result.parent = this.toQueryPath(path);
      result.structuredQuery!.from = [
        {
          collectionId: target.collectionGroup,
          allDescendants: true
        }
      ];
    } else {
      debugAssert(
        path.length % 2 !== 0,
        'Document queries with filters are not supported.'
      );
      result.parent = this.toQueryPath(path.popLast());
      result.structuredQuery!.from = [{ collectionId: path.lastSegment() }];
    }

    const where = this.toFilter(target.filters);
    if (where) {
      result.structuredQuery!.where = where;
    }

    const orderBy = this.toOrder(target.orderBy);
    if (orderBy) {
      result.structuredQuery!.orderBy = orderBy;
    }

    const limit = this.toInt32Proto(target.limit);
    if (limit !== null) {
      result.structuredQuery!.limit = limit;
    }

    if (target.startAt) {
      result.structuredQuery!.startAt = this.toCursor(target.startAt);
    }
    if (target.endAt) {
      result.structuredQuery!.endAt = this.toCursor(target.endAt);
    }

    return result;
  }

  fromQueryTarget(target: api.QueryTarget): Target {
    let path = this.fromQueryPath(target.parent!);

    const query = target.structuredQuery!;
    const fromCount = query.from ? query.from.length : 0;
    let collectionGroup: string | null = null;
    if (fromCount > 0) {
      hardAssert(
        fromCount === 1,
        'StructuredQuery.from with more than one collection is not supported.'
      );
      const from = query.from![0];
      if (from.allDescendants) {
        collectionGroup = from.collectionId!;
      } else {
        path = path.child(from.collectionId!);
      }
    }

    let filterBy: Filter[] = [];
    if (query.where) {
      filterBy = this.fromFilter(query.where);
    }

    let orderBy: OrderBy[] = [];
    if (query.orderBy) {
      orderBy = this.fromOrder(query.orderBy);
    }

    let limit: number | null = null;
    if (query.limit) {
      limit = this.fromInt32Proto(query.limit);
    }

    let startAt: Bound | null = null;
    if (query.startAt) {
      startAt = this.fromCursor(query.startAt);
    }

    let endAt: Bound | null = null;
    if (query.endAt) {
      endAt = this.fromCursor(query.endAt);
    }

    return new Query(
      path,
      collectionGroup,
      orderBy,
      filterBy,
      limit,
      LimitType.First,
      startAt,
      endAt
    ).toTarget();
  }

  toListenRequestLabels(
    targetData: TargetData
  ): api.ApiClientObjectMap<string> | null {
    const value = this.toLabel(targetData.purpose);
    if (value == null) {
      return null;
    } else {
      return {
        'goog-listen-tags': value
      };
    }
  }

  private toLabel(purpose: TargetPurpose): string | null {
    switch (purpose) {
      case TargetPurpose.Listen:
        return null;
      case TargetPurpose.ExistenceFilterMismatch:
        return 'existence-filter-mismatch';
      case TargetPurpose.LimboResolution:
        return 'limbo-document';
      default:
        return fail('Unrecognized query purpose: ' + purpose);
    }
  }

  toTarget(targetData: TargetData): api.Target {
    let result: api.Target;
    const target = targetData.target;

    if (target.isDocumentQuery()) {
      result = { documents: this.toDocumentsTarget(target) };
    } else {
      result = { query: this.toQueryTarget(target) };
    }

    result.targetId = targetData.targetId;

    if (targetData.resumeToken.approximateByteSize() > 0) {
      result.resumeToken = this.toBytes(targetData.resumeToken);
    }

    return result;
  }

  private toFilter(filters: Filter[]): api.Filter | undefined {
    if (filters.length === 0) {
      return;
    }
    const protos = filters.map(filter => {
      if (filter instanceof FieldFilter) {
        return this.toUnaryOrFieldFilter(filter);
      } else {
        return fail('Unrecognized filter: ' + JSON.stringify(filter));
      }
    });
    if (protos.length === 1) {
      return protos[0];
    }
    return { compositeFilter: { op: 'AND', filters: protos } };
  }

  private fromFilter(filter: api.Filter | undefined): Filter[] {
    if (!filter) {
      return [];
    } else if (filter.unaryFilter !== undefined) {
      return [this.fromUnaryFilter(filter)];
    } else if (filter.fieldFilter !== undefined) {
      return [this.fromFieldFilter(filter)];
    } else if (filter.compositeFilter !== undefined) {
      return filter.compositeFilter
        .filters!.map(f => this.fromFilter(f))
        .reduce((accum, current) => accum.concat(current));
    } else {
      return fail('Unknown filter: ' + JSON.stringify(filter));
    }
  }

  private toOrder(orderBys: OrderBy[]): api.Order[] | undefined {
    if (orderBys.length === 0) {
      return;
    }
    return orderBys.map(order => this.toPropertyOrder(order));
  }

  private fromOrder(orderBys: api.Order[]): OrderBy[] {
    return orderBys.map(order => this.fromPropertyOrder(order));
  }

  private toCursor(cursor: Bound): api.Cursor {
    return {
      before: cursor.before,
      values: cursor.position
    };
  }

  private fromCursor(cursor: api.Cursor): Bound {
    const before = !!cursor.before;
    const position = cursor.values || [];
    return new Bound(position, before);
  }

  // visible for testing
  toDirection(dir: Direction): api.OrderDirection {
    return DIRECTIONS[dir];
  }

  // visible for testing
  fromDirection(dir: api.OrderDirection | undefined): Direction | undefined {
    switch (dir) {
      case 'ASCENDING':
        return Direction.ASCENDING;
      case 'DESCENDING':
        return Direction.DESCENDING;
      default:
        return undefined;
    }
  }

  // visible for testing
  toOperatorName(op: Operator): api.FieldFilterOp {
    return OPERATORS[op];
  }

  fromOperatorName(op: api.FieldFilterOp): Operator {
    switch (op) {
      case 'EQUAL':
        return Operator.EQUAL;
      case 'GREATER_THAN':
        return Operator.GREATER_THAN;
      case 'GREATER_THAN_OR_EQUAL':
        return Operator.GREATER_THAN_OR_EQUAL;
      case 'LESS_THAN':
        return Operator.LESS_THAN;
      case 'LESS_THAN_OR_EQUAL':
        return Operator.LESS_THAN_OR_EQUAL;
      case 'ARRAY_CONTAINS':
        return Operator.ARRAY_CONTAINS;
      case 'IN':
        return Operator.IN;
      case 'ARRAY_CONTAINS_ANY':
        return Operator.ARRAY_CONTAINS_ANY;
      case 'OPERATOR_UNSPECIFIED':
        return fail('Unspecified operator');
      default:
        return fail('Unknown operator');
    }
  }

  toFieldPathReference(path: FieldPath): api.FieldReference {
    return { fieldPath: path.canonicalString() };
  }

  fromFieldPathReference(fieldReference: api.FieldReference): FieldPath {
    return FieldPath.fromServerFormat(fieldReference.fieldPath!);
  }

  // visible for testing
  toPropertyOrder(orderBy: OrderBy): api.Order {
    return {
      field: this.toFieldPathReference(orderBy.field),
      direction: this.toDirection(orderBy.dir)
    };
  }

  fromPropertyOrder(orderBy: api.Order): OrderBy {
    return new OrderBy(
      this.fromFieldPathReference(orderBy.field!),
      this.fromDirection(orderBy.direction)
    );
  }

  fromFieldFilter(filter: api.Filter): Filter {
    return FieldFilter.create(
      this.fromFieldPathReference(filter.fieldFilter!.field!),
      this.fromOperatorName(filter.fieldFilter!.op!),
      filter.fieldFilter!.value!
    );
  }

  // visible for testing
  toUnaryOrFieldFilter(filter: FieldFilter): api.Filter {
    if (filter.op === Operator.EQUAL) {
      if (isNanValue(filter.value)) {
        return {
          unaryFilter: {
            field: this.toFieldPathReference(filter.field),
            op: 'IS_NAN'
          }
        };
      } else if (isNullValue(filter.value)) {
        return {
          unaryFilter: {
            field: this.toFieldPathReference(filter.field),
            op: 'IS_NULL'
          }
        };
      }
    }
    return {
      fieldFilter: {
        field: this.toFieldPathReference(filter.field),
        op: this.toOperatorName(filter.op),
        value: filter.value
      }
    };
  }

  fromUnaryFilter(filter: api.Filter): Filter {
    switch (filter.unaryFilter!.op!) {
      case 'IS_NAN':
        const nanField = this.fromFieldPathReference(
          filter.unaryFilter!.field!
        );
        return FieldFilter.create(nanField, Operator.EQUAL, {
          doubleValue: NaN
        });
      case 'IS_NULL':
        const nullField = this.fromFieldPathReference(
          filter.unaryFilter!.field!
        );
        return FieldFilter.create(nullField, Operator.EQUAL, {
          nullValue: 'NULL_VALUE'
        });
      case 'OPERATOR_UNSPECIFIED':
        return fail('Unspecified filter');
      default:
        return fail('Unknown filter');
    }
  }

  toDocumentMask(fieldMask: FieldMask): api.DocumentMask {
    const canonicalFields: string[] = [];
    fieldMask.fields.forEach(field =>
      canonicalFields.push(field.canonicalString())
    );
    return {
      fieldPaths: canonicalFields
    };
  }

  fromDocumentMask(proto: api.DocumentMask): FieldMask {
    const paths = proto.fieldPaths || [];
    return new FieldMask(paths.map(path => FieldPath.fromServerFormat(path)));
  }
}

export function isValidResourceName(path: ResourcePath): boolean {
  // Resource names have at least 4 components (project ID, database ID)
  return (
    path.length >= 4 &&
    path.get(0) === 'projects' &&
    path.get(2) === 'databases'
  );
}

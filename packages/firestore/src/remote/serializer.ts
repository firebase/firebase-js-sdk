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

import { Timestamp } from '../api/timestamp';
import { DatabaseId } from '../core/database_info';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  LimitType,
  newQuery,
  newQueryForPath,
  Operator,
  OrderBy,
  queryToTarget
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { isDocumentTarget, Target } from '../core/target';
import { TargetId } from '../core/types';
import { TargetData, TargetPurpose } from '../local/target_data';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { ObjectValue } from '../model/object_value';
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
import { FieldPath, ResourcePath } from '../model/path';
import {
  ApiClientObjectMap as ProtoApiClientObjectMap,
  BatchGetDocumentsResponse as ProtoBatchGetDocumentsResponse,
  Cursor as ProtoCursor,
  Document as ProtoDocument,
  DocumentMask as ProtoDocumentMask,
  DocumentsTarget as ProtoDocumentsTarget,
  FieldFilterOp as ProtoFieldFilterOp,
  FieldReference as ProtoFieldReference,
  FieldTransform as ProtoFieldTransform,
  Filter as ProtoFilter,
  ListenResponse as ProtoListenResponse,
  Order as ProtoOrder,
  OrderDirection as ProtoOrderDirection,
  Precondition as ProtoPrecondition,
  QueryTarget as ProtoQueryTarget,
  Status as ProtoStatus,
  Target as ProtoTarget,
  Timestamp as ProtoTimestamp,
  Value as ProtoValue,
  Write as ProtoWrite,
  TargetChangeTargetChangeType as ProtoTargetChangeTargetChangeType,
  WriteResult as ProtoWriteResult
} from '../protos/firestore_proto_api';
import { debugAssert, fail, hardAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { ByteString } from '../util/byte_string';
import {
  isNegativeZero,
  isNullOrUndefined,
  isSafeInteger
} from '../util/types';
import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation,
  NumericIncrementTransformOperation,
  ServerTimestampTransform,
  TransformOperation
} from '../model/transform_operation';
import { ExistenceFilter } from './existence_filter';
import { mapCodeFromRpcCode } from './rpc_error';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from './watch_change';
import { isNanValue, isNullValue, normalizeTimestamp } from '../model/values';

const DIRECTIONS = (() => {
  const dirs: { [dir: string]: ProtoOrderDirection } = {};
  dirs[Direction.ASCENDING] = 'ASCENDING';
  dirs[Direction.DESCENDING] = 'DESCENDING';
  return dirs;
})();

const OPERATORS = (() => {
  const ops: { [op: string]: ProtoFieldFilterOp } = {};
  ops[Operator.LESS_THAN] = 'LESS_THAN';
  ops[Operator.LESS_THAN_OR_EQUAL] = 'LESS_THAN_OR_EQUAL';
  ops[Operator.GREATER_THAN] = 'GREATER_THAN';
  ops[Operator.GREATER_THAN_OR_EQUAL] = 'GREATER_THAN_OR_EQUAL';
  ops[Operator.EQUAL] = 'EQUAL';
  ops[Operator.NOT_EQUAL] = 'NOT_EQUAL';
  ops[Operator.ARRAY_CONTAINS] = 'ARRAY_CONTAINS';
  ops[Operator.IN] = 'IN';
  ops[Operator.NOT_IN] = 'NOT_IN';
  ops[Operator.ARRAY_CONTAINS_ANY] = 'ARRAY_CONTAINS_ANY';
  return ops;
})();

function assertPresent(value: unknown, description: string): asserts value {
  debugAssert(!isNullOrUndefined(value), description + ' is missing');
}

/**
 * This class generates JsonObject values for the Datastore API suitable for
 * sending to either GRPC stub methods or via the JSON/HTTP REST API.
 *
 * The serializer supports both Protobuf.js and Proto3 JSON formats. By
 * setting `useProto3Json` to true, the serializer will use the Proto3 JSON
 * format.
 *
 * For a description of the Proto3 JSON format check
 * https://developers.google.com/protocol-buffers/docs/proto3#json
 *
 * TODO(klimt): We can remove the databaseId argument if we keep the full
 * resource name in documents.
 */
export class JsonProtoSerializer {
  constructor(
    readonly databaseId: DatabaseId,
    readonly useProto3Json: boolean
  ) {}
}

function fromRpcStatus(status: ProtoStatus): FirestoreError {
  const code =
    status.code === undefined ? Code.UNKNOWN : mapCodeFromRpcCode(status.code);
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
function toInt32Proto(
  serializer: JsonProtoSerializer,
  val: number | null
): number | { value: number } | null {
  if (serializer.useProto3Json || isNullOrUndefined(val)) {
    return val;
  } else {
    return { value: val };
  }
}

/**
 * Returns a number (or null) from a google.protobuf.Int32Value proto.
 */
function fromInt32Proto(
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
export function toInteger(value: number): ProtoValue {
  return { integerValue: '' + value };
}

/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */
export function toDouble(
  serializer: JsonProtoSerializer,
  value: number
): ProtoValue {
  if (serializer.useProto3Json) {
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
export function toNumber(
  serializer: JsonProtoSerializer,
  value: number
): ProtoValue {
  return isSafeInteger(value) ? toInteger(value) : toDouble(serializer, value);
}

/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */
export function toTimestamp(
  serializer: JsonProtoSerializer,
  timestamp: Timestamp
): ProtoTimestamp {
  if (serializer.useProto3Json) {
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

function fromTimestamp(date: ProtoTimestamp): Timestamp {
  const timestamp = normalizeTimestamp(date);
  return new Timestamp(timestamp.seconds, timestamp.nanos);
}

/**
 * Returns a value for bytes that's appropriate to put in a proto.
 *
 * Visible for testing.
 */
export function toBytes(
  serializer: JsonProtoSerializer,
  bytes: ByteString
): string | Uint8Array {
  if (serializer.useProto3Json) {
    return bytes.toBase64();
  } else {
    return bytes.toUint8Array();
  }
}

/**
 * Returns a ByteString based on the proto string value.
 */
export function fromBytes(
  serializer: JsonProtoSerializer,
  value: string | Uint8Array | undefined
): ByteString {
  if (serializer.useProto3Json) {
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

export function toVersion(
  serializer: JsonProtoSerializer,
  version: SnapshotVersion
): ProtoTimestamp {
  return toTimestamp(serializer, version.toTimestamp());
}

export function fromVersion(version: ProtoTimestamp): SnapshotVersion {
  hardAssert(!!version, "Trying to deserialize version that isn't set");
  return SnapshotVersion.fromTimestamp(fromTimestamp(version));
}

export function toResourceName(
  databaseId: DatabaseId,
  path: ResourcePath
): string {
  return fullyQualifiedPrefixPath(databaseId)
    .child('documents')
    .child(path)
    .canonicalString();
}

function fromResourceName(name: string): ResourcePath {
  const resource = ResourcePath.fromString(name);
  hardAssert(
    isValidResourceName(resource),
    'Tried to deserialize invalid key ' + resource.toString()
  );
  return resource;
}

export function toName(
  serializer: JsonProtoSerializer,
  key: DocumentKey
): string {
  return toResourceName(serializer.databaseId, key.path);
}

export function fromName(
  serializer: JsonProtoSerializer,
  name: string
): DocumentKey {
  const resource = fromResourceName(name);
  hardAssert(
    resource.get(1) === serializer.databaseId.projectId,
    'Tried to deserialize key from different project: ' +
      resource.get(1) +
      ' vs ' +
      serializer.databaseId.projectId
  );
  hardAssert(
    (!resource.get(3) && !serializer.databaseId.database) ||
      resource.get(3) === serializer.databaseId.database,
    'Tried to deserialize key from different database: ' +
      resource.get(3) +
      ' vs ' +
      serializer.databaseId.database
  );
  return new DocumentKey(extractLocalPathFromResourceName(resource));
}

function toQueryPath(
  serializer: JsonProtoSerializer,
  path: ResourcePath
): string {
  return toResourceName(serializer.databaseId, path);
}

function fromQueryPath(name: string): ResourcePath {
  const resourceName = fromResourceName(name);
  // In v1beta1 queries for collections at the root did not have a trailing
  // "/documents". In v1 all resource paths contain "/documents". Preserve the
  // ability to read the v1beta1 form for compatibility with queries persisted
  // in the local target cache.
  if (resourceName.length === 4) {
    return ResourcePath.emptyPath();
  }
  return extractLocalPathFromResourceName(resourceName);
}

export function getEncodedDatabaseId(serializer: JsonProtoSerializer): string {
  const path = new ResourcePath([
    'projects',
    serializer.databaseId.projectId,
    'databases',
    serializer.databaseId.database
  ]);
  return path.canonicalString();
}

function fullyQualifiedPrefixPath(databaseId: DatabaseId): ResourcePath {
  return new ResourcePath([
    'projects',
    databaseId.projectId,
    'databases',
    databaseId.database
  ]);
}

function extractLocalPathFromResourceName(
  resourceName: ResourcePath
): ResourcePath {
  hardAssert(
    resourceName.length > 4 && resourceName.get(4) === 'documents',
    'tried to deserialize invalid key ' + resourceName.toString()
  );
  return resourceName.popFirst(5);
}

/** Creates a Document proto from key and fields (but no create/update time) */
export function toMutationDocument(
  serializer: JsonProtoSerializer,
  key: DocumentKey,
  fields: ObjectValue
): ProtoDocument {
  return {
    name: toName(serializer, key),
    fields: fields.proto.mapValue.fields
  };
}

export function toDocument(
  serializer: JsonProtoSerializer,
  document: Document
): ProtoDocument {
  debugAssert(
    !document.hasLocalMutations,
    "Can't serialize documents with mutations."
  );
  return {
    name: toName(serializer, document.key),
    fields: document.toProto().mapValue.fields,
    updateTime: toTimestamp(serializer, document.version.toTimestamp())
  };
}

export function fromDocument(
  serializer: JsonProtoSerializer,
  document: ProtoDocument,
  hasCommittedMutations?: boolean
): Document {
  const key = fromName(serializer, document.name!);
  const version = fromVersion(document.updateTime!);
  const data = new ObjectValue({ mapValue: { fields: document.fields } });
  return new Document(key, version, data, {
    hasCommittedMutations: !!hasCommittedMutations
  });
}

function fromFound(
  serializer: JsonProtoSerializer,
  doc: ProtoBatchGetDocumentsResponse
): Document {
  hardAssert(
    !!doc.found,
    'Tried to deserialize a found document from a missing document.'
  );
  assertPresent(doc.found.name, 'doc.found.name');
  assertPresent(doc.found.updateTime, 'doc.found.updateTime');
  const key = fromName(serializer, doc.found.name);
  const version = fromVersion(doc.found.updateTime);
  const data = new ObjectValue({ mapValue: { fields: doc.found.fields } });
  return new Document(key, version, data, {});
}

function fromMissing(
  serializer: JsonProtoSerializer,
  result: ProtoBatchGetDocumentsResponse
): NoDocument {
  hardAssert(
    !!result.missing,
    'Tried to deserialize a missing document from a found document.'
  );
  hardAssert(
    !!result.readTime,
    'Tried to deserialize a missing document without a read time.'
  );
  const key = fromName(serializer, result.missing);
  const version = fromVersion(result.readTime);
  return new NoDocument(key, version);
}

export function fromMaybeDocument(
  serializer: JsonProtoSerializer,
  result: ProtoBatchGetDocumentsResponse
): MaybeDocument {
  if ('found' in result) {
    return fromFound(serializer, result);
  } else if ('missing' in result) {
    return fromMissing(serializer, result);
  }
  return fail('invalid batch get response: ' + JSON.stringify(result));
}

export function fromWatchChange(
  serializer: JsonProtoSerializer,
  change: ProtoListenResponse
): WatchChange {
  let watchChange: WatchChange;
  if ('targetChange' in change) {
    assertPresent(change.targetChange, 'targetChange');
    // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
    // if unset
    const state = fromWatchTargetChangeState(
      change.targetChange.targetChangeType || 'NO_CHANGE'
    );
    const targetIds: TargetId[] = change.targetChange.targetIds || [];

    const resumeToken = fromBytes(serializer, change.targetChange.resumeToken);
    const causeProto = change.targetChange!.cause;
    const cause = causeProto && fromRpcStatus(causeProto);
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
    const key = fromName(serializer, entityChange.document.name);
    const version = fromVersion(entityChange.document.updateTime);
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
    const key = fromName(serializer, docDelete.document);
    const version = docDelete.readTime
      ? fromVersion(docDelete.readTime)
      : SnapshotVersion.min();
    const doc = new NoDocument(key, version);
    const removedTargetIds = docDelete.removedTargetIds || [];
    watchChange = new DocumentWatchChange([], removedTargetIds, doc.key, doc);
  } else if ('documentRemove' in change) {
    assertPresent(change.documentRemove, 'documentRemove');
    const docRemove = change.documentRemove;
    assertPresent(docRemove.document, 'documentRemove');
    const key = fromName(serializer, docRemove.document);
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

function fromWatchTargetChangeState(
  state: ProtoTargetChangeTargetChangeType
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

export function versionFromListenResponse(
  change: ProtoListenResponse
): SnapshotVersion {
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
  return fromVersion(targetChange.readTime);
}

export function toMutation(
  serializer: JsonProtoSerializer,
  mutation: Mutation
): ProtoWrite {
  let result: ProtoWrite;
  if (mutation instanceof SetMutation) {
    result = {
      update: toMutationDocument(serializer, mutation.key, mutation.value)
    };
  } else if (mutation instanceof DeleteMutation) {
    result = { delete: toName(serializer, mutation.key) };
  } else if (mutation instanceof PatchMutation) {
    result = {
      update: toMutationDocument(serializer, mutation.key, mutation.data),
      updateMask: toDocumentMask(mutation.fieldMask)
    };
  } else if (mutation instanceof TransformMutation) {
    result = {
      transform: {
        document: toName(serializer, mutation.key),
        fieldTransforms: mutation.fieldTransforms.map(transform =>
          toFieldTransform(serializer, transform)
        )
      }
    };
  } else if (mutation instanceof VerifyMutation) {
    result = {
      verify: toName(serializer, mutation.key)
    };
  } else {
    return fail('Unknown mutation type ' + mutation.type);
  }

  if (!mutation.precondition.isNone) {
    result.currentDocument = toPrecondition(serializer, mutation.precondition);
  }

  return result;
}

export function fromMutation(
  serializer: JsonProtoSerializer,
  proto: ProtoWrite
): Mutation {
  const precondition = proto.currentDocument
    ? fromPrecondition(proto.currentDocument)
    : Precondition.none();

  if (proto.update) {
    assertPresent(proto.update.name, 'name');
    const key = fromName(serializer, proto.update.name);
    const value = new ObjectValue({
      mapValue: { fields: proto.update.fields }
    });
    if (proto.updateMask) {
      const fieldMask = fromDocumentMask(proto.updateMask);
      return new PatchMutation(key, value, fieldMask, precondition);
    } else {
      return new SetMutation(key, value, precondition);
    }
  } else if (proto.delete) {
    const key = fromName(serializer, proto.delete);
    return new DeleteMutation(key, precondition);
  } else if (proto.transform) {
    const key = fromName(serializer, proto.transform.document!);
    const fieldTransforms = proto.transform.fieldTransforms!.map(transform =>
      fromFieldTransform(serializer, transform)
    );
    hardAssert(
      precondition.exists === true,
      'Transforms only support precondition "exists == true"'
    );
    return new TransformMutation(key, fieldTransforms);
  } else if (proto.verify) {
    const key = fromName(serializer, proto.verify);
    return new VerifyMutation(key, precondition);
  } else {
    return fail('unknown mutation proto: ' + JSON.stringify(proto));
  }
}

function toPrecondition(
  serializer: JsonProtoSerializer,
  precondition: Precondition
): ProtoPrecondition {
  debugAssert(!precondition.isNone, "Can't serialize an empty precondition");
  if (precondition.updateTime !== undefined) {
    return {
      updateTime: toVersion(serializer, precondition.updateTime)
    };
  } else if (precondition.exists !== undefined) {
    return { exists: precondition.exists };
  } else {
    return fail('Unknown precondition');
  }
}

function fromPrecondition(precondition: ProtoPrecondition): Precondition {
  if (precondition.updateTime !== undefined) {
    return Precondition.updateTime(fromVersion(precondition.updateTime));
  } else if (precondition.exists !== undefined) {
    return Precondition.exists(precondition.exists);
  } else {
    return Precondition.none();
  }
}

function fromWriteResult(
  proto: ProtoWriteResult,
  commitTime: ProtoTimestamp
): MutationResult {
  // NOTE: Deletes don't have an updateTime.
  let version = proto.updateTime
    ? fromVersion(proto.updateTime)
    : fromVersion(commitTime);

  if (version.isEqual(SnapshotVersion.min())) {
    // The Firestore Emulator currently returns an update time of 0 for
    // deletes of non-existing documents (rather than null). This breaks the
    // test "get deleted doc while offline with source=cache" as NoDocuments
    // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
    // TODO(#2149): Remove this when Emulator is fixed
    version = fromVersion(commitTime);
  }

  let transformResults: ProtoValue[] | null = null;
  if (proto.transformResults && proto.transformResults.length > 0) {
    transformResults = proto.transformResults;
  }
  return new MutationResult(version, transformResults);
}

export function fromWriteResults(
  protos: ProtoWriteResult[] | undefined,
  commitTime?: ProtoTimestamp
): MutationResult[] {
  if (protos && protos.length > 0) {
    hardAssert(
      commitTime !== undefined,
      'Received a write result without a commit time'
    );
    return protos.map(proto => fromWriteResult(proto, commitTime));
  } else {
    return [];
  }
}

function toFieldTransform(
  serializer: JsonProtoSerializer,
  fieldTransform: FieldTransform
): ProtoFieldTransform {
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

function fromFieldTransform(
  serializer: JsonProtoSerializer,
  proto: ProtoFieldTransform
): FieldTransform {
  let transform: TransformOperation | null = null;
  if ('setToServerValue' in proto) {
    hardAssert(
      proto.setToServerValue === 'REQUEST_TIME',
      'Unknown server value transform proto: ' + JSON.stringify(proto)
    );
    transform = new ServerTimestampTransform();
  } else if ('appendMissingElements' in proto) {
    const values = proto.appendMissingElements!.values || [];
    transform = new ArrayUnionTransformOperation(values);
  } else if ('removeAllFromArray' in proto) {
    const values = proto.removeAllFromArray!.values || [];
    transform = new ArrayRemoveTransformOperation(values);
  } else if ('increment' in proto) {
    transform = new NumericIncrementTransformOperation(
      serializer,
      proto.increment!
    );
  } else {
    fail('Unknown transform proto: ' + JSON.stringify(proto));
  }
  const fieldPath = FieldPath.fromServerFormat(proto.fieldPath!);
  return new FieldTransform(fieldPath, transform!);
}

export function toDocumentsTarget(
  serializer: JsonProtoSerializer,
  target: Target
): ProtoDocumentsTarget {
  return { documents: [toQueryPath(serializer, target.path)] };
}

export function fromDocumentsTarget(
  documentsTarget: ProtoDocumentsTarget
): Target {
  const count = documentsTarget.documents!.length;
  hardAssert(
    count === 1,
    'DocumentsTarget contained other than 1 document: ' + count
  );
  const name = documentsTarget.documents![0];
  return queryToTarget(newQueryForPath(fromQueryPath(name)));
}

export function toQueryTarget(
  serializer: JsonProtoSerializer,
  target: Target
): ProtoQueryTarget {
  // Dissect the path into parent, collectionId, and optional key filter.
  const result: ProtoQueryTarget = { structuredQuery: {} };
  const path = target.path;
  if (target.collectionGroup !== null) {
    debugAssert(
      path.length % 2 === 0,
      'Collection Group queries should be within a document path or root.'
    );
    result.parent = toQueryPath(serializer, path);
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
    result.parent = toQueryPath(serializer, path.popLast());
    result.structuredQuery!.from = [{ collectionId: path.lastSegment() }];
  }

  const where = toFilter(target.filters);
  if (where) {
    result.structuredQuery!.where = where;
  }

  const orderBy = toOrder(target.orderBy);
  if (orderBy) {
    result.structuredQuery!.orderBy = orderBy;
  }

  const limit = toInt32Proto(serializer, target.limit);
  if (limit !== null) {
    result.structuredQuery!.limit = limit;
  }

  if (target.startAt) {
    result.structuredQuery!.startAt = toCursor(target.startAt);
  }
  if (target.endAt) {
    result.structuredQuery!.endAt = toCursor(target.endAt);
  }

  return result;
}

export function fromQueryTarget(target: ProtoQueryTarget): Target {
  let path = fromQueryPath(target.parent!);

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
    filterBy = fromFilter(query.where);
  }

  let orderBy: OrderBy[] = [];
  if (query.orderBy) {
    orderBy = fromOrder(query.orderBy);
  }

  let limit: number | null = null;
  if (query.limit) {
    limit = fromInt32Proto(query.limit);
  }

  let startAt: Bound | null = null;
  if (query.startAt) {
    startAt = fromCursor(query.startAt);
  }

  let endAt: Bound | null = null;
  if (query.endAt) {
    endAt = fromCursor(query.endAt);
  }

  return queryToTarget(
    newQuery(
      path,
      collectionGroup,
      orderBy,
      filterBy,
      limit,
      LimitType.First,
      startAt,
      endAt
    )
  );
}

export function toListenRequestLabels(
  serializer: JsonProtoSerializer,
  targetData: TargetData
): ProtoApiClientObjectMap<string> | null {
  const value = toLabel(serializer, targetData.purpose);
  if (value == null) {
    return null;
  } else {
    return {
      'goog-listen-tags': value
    };
  }
}

function toLabel(
  serializer: JsonProtoSerializer,
  purpose: TargetPurpose
): string | null {
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

export function toTarget(
  serializer: JsonProtoSerializer,
  targetData: TargetData
): ProtoTarget {
  let result: ProtoTarget;
  const target = targetData.target;

  if (isDocumentTarget(target)) {
    result = { documents: toDocumentsTarget(serializer, target) };
  } else {
    result = { query: toQueryTarget(serializer, target) };
  }

  result.targetId = targetData.targetId;

  if (targetData.resumeToken.approximateByteSize() > 0) {
    result.resumeToken = toBytes(serializer, targetData.resumeToken);
  }

  return result;
}

function toFilter(filters: Filter[]): ProtoFilter | undefined {
  if (filters.length === 0) {
    return;
  }
  const protos = filters.map(filter => {
    debugAssert(
      filter instanceof FieldFilter,
      'Only FieldFilters are supported'
    );
    return toUnaryOrFieldFilter(filter);
  });
  if (protos.length === 1) {
    return protos[0];
  }
  return { compositeFilter: { op: 'AND', filters: protos } };
}

function fromFilter(filter: ProtoFilter | undefined): Filter[] {
  if (!filter) {
    return [];
  } else if (filter.unaryFilter !== undefined) {
    return [fromUnaryFilter(filter)];
  } else if (filter.fieldFilter !== undefined) {
    return [fromFieldFilter(filter)];
  } else if (filter.compositeFilter !== undefined) {
    return filter.compositeFilter
      .filters!.map(f => fromFilter(f))
      .reduce((accum, current) => accum.concat(current));
  } else {
    return fail('Unknown filter: ' + JSON.stringify(filter));
  }
}

function toOrder(orderBys: OrderBy[]): ProtoOrder[] | undefined {
  if (orderBys.length === 0) {
    return;
  }
  return orderBys.map(order => toPropertyOrder(order));
}

function fromOrder(orderBys: ProtoOrder[]): OrderBy[] {
  return orderBys.map(order => fromPropertyOrder(order));
}

function toCursor(cursor: Bound): ProtoCursor {
  return {
    before: cursor.before,
    values: cursor.position
  };
}

function fromCursor(cursor: ProtoCursor): Bound {
  const before = !!cursor.before;
  const position = cursor.values || [];
  return new Bound(position, before);
}

// visible for testing
export function toDirection(dir: Direction): ProtoOrderDirection {
  return DIRECTIONS[dir];
}

// visible for testing
export function fromDirection(
  dir: ProtoOrderDirection | undefined
): Direction | undefined {
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
export function toOperatorName(op: Operator): ProtoFieldFilterOp {
  return OPERATORS[op];
}

export function fromOperatorName(op: ProtoFieldFilterOp): Operator {
  switch (op) {
    case 'EQUAL':
      return Operator.EQUAL;
    case 'NOT_EQUAL':
      return Operator.NOT_EQUAL;
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
    case 'NOT_IN':
      return Operator.NOT_IN;
    case 'ARRAY_CONTAINS_ANY':
      return Operator.ARRAY_CONTAINS_ANY;
    case 'OPERATOR_UNSPECIFIED':
      return fail('Unspecified operator');
    default:
      return fail('Unknown operator');
  }
}

export function toFieldPathReference(path: FieldPath): ProtoFieldReference {
  return { fieldPath: path.canonicalString() };
}

export function fromFieldPathReference(
  fieldReference: ProtoFieldReference
): FieldPath {
  return FieldPath.fromServerFormat(fieldReference.fieldPath!);
}

// visible for testing
export function toPropertyOrder(orderBy: OrderBy): ProtoOrder {
  return {
    field: toFieldPathReference(orderBy.field),
    direction: toDirection(orderBy.dir)
  };
}

export function fromPropertyOrder(orderBy: ProtoOrder): OrderBy {
  return new OrderBy(
    fromFieldPathReference(orderBy.field!),
    fromDirection(orderBy.direction)
  );
}

export function fromFieldFilter(filter: ProtoFilter): Filter {
  return FieldFilter.create(
    fromFieldPathReference(filter.fieldFilter!.field!),
    fromOperatorName(filter.fieldFilter!.op!),
    filter.fieldFilter!.value!
  );
}

// visible for testing
export function toUnaryOrFieldFilter(filter: FieldFilter): ProtoFilter {
  if (filter.op === Operator.EQUAL) {
    if (isNanValue(filter.value)) {
      return {
        unaryFilter: {
          field: toFieldPathReference(filter.field),
          op: 'IS_NAN'
        }
      };
    } else if (isNullValue(filter.value)) {
      return {
        unaryFilter: {
          field: toFieldPathReference(filter.field),
          op: 'IS_NULL'
        }
      };
    }
  } else if (filter.op === Operator.NOT_EQUAL) {
    if (isNanValue(filter.value)) {
      return {
        unaryFilter: {
          field: toFieldPathReference(filter.field),
          op: 'IS_NOT_NAN'
        }
      };
    } else if (isNullValue(filter.value)) {
      return {
        unaryFilter: {
          field: toFieldPathReference(filter.field),
          op: 'IS_NOT_NULL'
        }
      };
    }
  }
  return {
    fieldFilter: {
      field: toFieldPathReference(filter.field),
      op: toOperatorName(filter.op),
      value: filter.value
    }
  };
}

export function fromUnaryFilter(filter: ProtoFilter): Filter {
  switch (filter.unaryFilter!.op!) {
    case 'IS_NAN':
      const nanField = fromFieldPathReference(filter.unaryFilter!.field!);
      return FieldFilter.create(nanField, Operator.EQUAL, {
        doubleValue: NaN
      });
    case 'IS_NULL':
      const nullField = fromFieldPathReference(filter.unaryFilter!.field!);
      return FieldFilter.create(nullField, Operator.EQUAL, {
        nullValue: 'NULL_VALUE'
      });
    case 'IS_NOT_NAN':
      const notNanField = fromFieldPathReference(filter.unaryFilter!.field!);
      return FieldFilter.create(notNanField, Operator.NOT_EQUAL, {
        doubleValue: NaN
      });
    case 'IS_NOT_NULL':
      const notNullField = fromFieldPathReference(filter.unaryFilter!.field!);
      return FieldFilter.create(notNullField, Operator.NOT_EQUAL, {
        nullValue: 'NULL_VALUE'
      });
    case 'OPERATOR_UNSPECIFIED':
      return fail('Unspecified filter');
    default:
      return fail('Unknown filter');
  }
}

export function toDocumentMask(fieldMask: FieldMask): ProtoDocumentMask {
  const canonicalFields: string[] = [];
  fieldMask.fields.forEach(field =>
    canonicalFields.push(field.canonicalString())
  );
  return {
    fieldPaths: canonicalFields
  };
}

export function fromDocumentMask(proto: ProtoDocumentMask): FieldMask {
  const paths = proto.fieldPaths || [];
  return new FieldMask(paths.map(path => FieldPath.fromServerFormat(path)));
}

export function isValidResourceName(path: ResourcePath): boolean {
  // Resource names have at least 4 components (project ID, database ID)
  return (
    path.length >= 4 &&
    path.get(0) === 'projects' &&
    path.get(2) === 'databases'
  );
}

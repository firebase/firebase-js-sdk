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

import { Blob } from '../api/blob';
import { GeoPoint } from '../api/geo_point';
import { Timestamp } from '../api/timestamp';
import { DatabaseId } from '../core/database_info';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  Operator,
  OrderBy,
  Query
} from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { ProtoByteString, TargetId } from '../core/types';
import { QueryData, QueryPurpose } from '../local/query_data';
import { Document, MaybeDocument, NoDocument } from '../model/document';
import { DocumentKey } from '../model/document_key';
import * as fieldValue from '../model/field_value';
import {
  DeleteMutation,
  FieldMask,
  FieldTransform,
  Mutation,
  MutationResult,
  PatchMutation,
  Precondition,
  SetMutation,
  TransformMutation
} from '../model/mutation';
import { FieldPath, ResourcePath } from '../model/path';
import * as api from '../protos/firestore_proto_api';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import * as obj from '../util/obj';
import * as typeUtils from '../util/types';

import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation,
  NumericIncrementTransformOperation,
  ServerTimestampTransform,
  TransformOperation
} from '../model/transform_operation';
import { ExistenceFilter } from './existence_filter';
import { mapCodeFromRpcCode, mapRpcCodeFromCode } from './rpc_error';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from './watch_change';

const DIRECTIONS = (() => {
  const dirs: { [dir: string]: api.OrderDirection } = {};
  dirs[Direction.ASCENDING.name] = 'ASCENDING';
  dirs[Direction.DESCENDING.name] = 'DESCENDING';
  return dirs;
})();

const OPERATORS = (() => {
  const ops: { [op: string]: api.FieldFilterOp } = {};
  ops[Operator.LESS_THAN.name] = 'LESS_THAN';
  ops[Operator.LESS_THAN_OR_EQUAL.name] = 'LESS_THAN_OR_EQUAL';
  ops[Operator.GREATER_THAN.name] = 'GREATER_THAN';
  ops[Operator.GREATER_THAN_OR_EQUAL.name] = 'GREATER_THAN_OR_EQUAL';
  ops[Operator.EQUAL.name] = 'EQUAL';
  ops[Operator.ARRAY_CONTAINS.name] = 'ARRAY_CONTAINS';
  ops[Operator.IN.name] = 'IN';
  ops[Operator.ARRAY_CONTAINS_ANY.name] = 'ARRAY_CONTAINS_ANY';
  return ops;
})();

// A RegExp matching ISO 8601 UTC timestamps with optional fraction.
const ISO_REG_EXP = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

function assertPresent(value: unknown, description: string): void {
  assert(!typeUtils.isNullOrUndefined(value), description + ' is missing');
}

function parseInt64(value: number | string): number {
  // TODO(bjornick): Handle int64 greater than 53 bits.
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    return Number(value);
  } else {
    return fail("can't parse " + value);
  }
}

// This is a supplement to the generated proto interfaces, which fail to account
// for the fact that a timestamp may be encoded as either a string OR this.
interface TimestampProto {
  seconds?: string;
  nanos?: number;
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

  private emptyByteString(): ProtoByteString {
    if (this.options.useProto3Json) {
      return '';
    } else {
      return new Uint8Array(0);
    }
  }

  private unsafeCastProtoByteString(byteString: ProtoByteString): string {
    // byteStrings can be either string or UInt8Array, but the typings say
    // it's always a string. Cast as string to avoid type check failing
    return byteString as string;
  }

  fromRpcStatus(status: api.Status): FirestoreError {
    const code =
      status.code === undefined
        ? Code.UNKNOWN
        : mapCodeFromRpcCode(status.code);
    return new FirestoreError(code, status.message || '');
  }

  /**
   * Returns a value for a number (or undefined) that's appropriate to put into
   * a google.protobuf.Int32Value proto.
   * DO NOT USE THIS FOR ANYTHING ELSE.
   * This method cheats. It's typed as returning "number" because that's what
   * our generated proto interfaces say Int32Value must be. But GRPC actually
   * expects a { value: <number> } struct.
   */
  private toInt32Value(val: number | null): number | undefined {
    if (!typeUtils.isNullOrUndefined(val)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, We need to match generated Proto types.
      return { value: val } as any;
    } else {
      return undefined;
    }
  }

  /**
   * Returns a number (or null) from a google.protobuf.Int32Value proto.
   * DO NOT USE THIS FOR ANYTHING ELSE.
   * This method cheats. It's typed as accepting "number" because that's what
   * our generated proto interfaces say Int32Value must be, but it actually
   * accepts { value: number } to match our serialization in toInt32Value().
   */
  private fromInt32Value(val: number | undefined): number | null {
    let result;
    if (typeof val === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, We need to match generated Proto types.
      result = (val as any).value;
    } else {
      // We accept raw numbers (without the {value: ... } wrapper) for
      // compatibility with legacy persisted data.
      result = val;
    }
    return typeUtils.isNullOrUndefined(result) ? null : result;
  }

  /**
   * Returns a value for a Date that's appropriate to put into a proto.
   * DO NOT USE THIS FOR ANYTHING ELSE.
   * This method cheats. It's typed as returning "string" because that's what
   * our generated proto interfaces say dates must be. But it's easier and safer
   * to actually return a Timestamp proto.
   */
  private toTimestamp(timestamp: Timestamp): string {
    return {
      seconds: '' + timestamp.seconds,
      nanos: timestamp.nanoseconds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  private fromTimestamp(date: string | TimestampProto): Timestamp {
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if (typeof date === 'string') {
      // TODO(b/37282237): Use strings for Proto3 timestamps
      // assert(this.options.useProto3Json,
      //   'The timestamp string format requires Proto3.');
      return this.fromIso8601String(date);
    } else {
      assert(!!date, 'Cannot deserialize null or undefined timestamp.');
      // TODO(b/37282237): Use strings for Proto3 timestamps
      // assert(!this.options.useProto3Json,
      //   'The timestamp instance format requires Proto JS.');
      const seconds = parseInt64(date.seconds || '0');
      const nanos = date.nanos || 0;
      return new Timestamp(seconds, nanos);
    }
  }

  private fromIso8601String(utc: string): Timestamp {
    // The date string can have higher precision (nanos) than the Date class
    // (millis), so we do some custom parsing here.

    // Parse the nanos right out of the string.
    let nanos = 0;
    const fraction = ISO_REG_EXP.exec(utc);
    assert(!!fraction, 'invalid timestamp: ' + utc);
    if (fraction![1]) {
      // Pad the fraction out to 9 digits (nanos).
      let nanoStr = fraction![1];
      nanoStr = (nanoStr + '000000000').substr(0, 9);
      nanos = Number(nanoStr);
    }

    // Parse the date to get the seconds.
    const date = new Date(utc);
    const seconds = Math.floor(date.getTime() / 1000);

    return new Timestamp(seconds, nanos);
  }

  /**
   * Returns a value for bytes that's appropriate to put in a proto.
   * DO NOT USE THIS FOR ANYTHING ELSE.
   * This method cheats. It's typed as returning "string" because that's what
   * our generated proto interfaces say bytes must be. But it should return
   * an Uint8Array in Node.
   */
  private toBytes(bytes: Blob): string {
    if (this.options.useProto3Json) {
      return bytes.toBase64();
    } else {
      // The typings say it's a string, but it needs to be a Uint8Array in Node.
      return this.unsafeCastProtoByteString(bytes.toUint8Array());
    }
  }

  /**
   * Parse the blob from the protos into the internal Blob class. Note that the
   * typings assume all blobs are strings, but they are actually Uint8Arrays
   * on Node.
   */
  private fromBlob(blob: string | Uint8Array): Blob {
    if (typeof blob === 'string') {
      assert(
        this.options.useProto3Json,
        'Expected bytes to be passed in as Uint8Array, but got a string instead.'
      );
      return Blob.fromBase64String(blob);
    } else {
      assert(
        !this.options.useProto3Json,
        'Expected bytes to be passed in as Uint8Array, but got a string instead.'
      );
      return Blob.fromUint8Array(blob);
    }
  }

  toVersion(version: SnapshotVersion): string {
    return this.toTimestamp(version.toTimestamp());
  }

  fromVersion(version: string): SnapshotVersion {
    assert(!!version, "Trying to deserialize version that isn't set");
    return SnapshotVersion.fromTimestamp(this.fromTimestamp(version));
  }

  toResourceName(databaseId: DatabaseId, path: ResourcePath): string {
    return this.fullyQualifiedPrefixPath(databaseId)
      .child('documents')
      .child(path)
      .canonicalString();
  }

  fromResourceName(name: string): ResourcePath {
    const resource = ResourcePath.fromString(name);
    assert(
      this.isValidResourceName(resource),
      'Tried to deserialize invalid key ' + resource.toString()
    );
    return resource;
  }

  toName(key: DocumentKey): string {
    return this.toResourceName(this.databaseId, key.path);
  }

  fromName(name: string): DocumentKey {
    const resource = this.fromResourceName(name);
    assert(
      resource.get(1) === this.databaseId.projectId,
      'Tried to deserialize key from different project: ' +
        resource.get(1) +
        ' vs ' +
        this.databaseId.projectId
    );
    assert(
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
    return this.toResourceName(this.databaseId, path);
  }

  fromQueryPath(name: string): ResourcePath {
    const resourceName = this.fromResourceName(name);
    // In v1beta1 queries for collections at the root did not have a trailing
    // "/documents". In v1 all resource paths contain "/documents". Preserve the
    // ability to read the v1beta1 form for compatibility with queries persisted
    // in the local query cache.
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
    assert(
      resourceName.length > 4 && resourceName.get(4) === 'documents',
      'tried to deserialize invalid key ' + resourceName.toString()
    );
    return resourceName.popFirst(5);
  }

  private isValidResourceName(path: ResourcePath): boolean {
    // Resource names have at least 4 components (project ID, database ID)
    return (
      path.length >= 4 &&
      path.get(0) === 'projects' &&
      path.get(2) === 'databases'
    );
  }

  toValue(val: fieldValue.FieldValue): api.Value {
    if (val instanceof fieldValue.NullValue) {
      return { nullValue: 'NULL_VALUE' };
    } else if (val instanceof fieldValue.BooleanValue) {
      return { booleanValue: val.value() };
    } else if (val instanceof fieldValue.IntegerValue) {
      return { integerValue: '' + val.value() };
    } else if (val instanceof fieldValue.DoubleValue) {
      const doubleValue = val.value();
      if (this.options.useProto3Json) {
        // Proto 3 let's us encode NaN and Infinity as string values as
        // expected by the backend. This is currently not checked by our unit
        // tests because they rely on protobuf.js.
        if (isNaN(doubleValue)) {
          return { doubleValue: 'NaN' } as {};
        } else if (doubleValue === Infinity) {
          return { doubleValue: 'Infinity' } as {};
        } else if (doubleValue === -Infinity) {
          return { doubleValue: '-Infinity' } as {};
        }
      }
      return { doubleValue: val.value() };
    } else if (val instanceof fieldValue.StringValue) {
      return { stringValue: val.value() };
    } else if (val instanceof fieldValue.ObjectValue) {
      return { mapValue: this.toMapValue(val) };
    } else if (val instanceof fieldValue.ArrayValue) {
      return { arrayValue: this.toArrayValue(val) };
    } else if (val instanceof fieldValue.TimestampValue) {
      return {
        timestampValue: this.toTimestamp(val.internalValue)
      };
    } else if (val instanceof fieldValue.GeoPointValue) {
      return {
        geoPointValue: {
          latitude: val.value().latitude,
          longitude: val.value().longitude
        }
      };
    } else if (val instanceof fieldValue.BlobValue) {
      return {
        bytesValue: this.toBytes(val.value())
      };
    } else if (val instanceof fieldValue.RefValue) {
      return {
        referenceValue: this.toResourceName(val.databaseId, val.key.path)
      };
    } else {
      return fail('Unknown FieldValue ' + JSON.stringify(val));
    }
  }

  fromValue(obj: api.Value): fieldValue.FieldValue {
    if ('nullValue' in obj) {
      return fieldValue.NullValue.INSTANCE;
    } else if ('booleanValue' in obj) {
      return fieldValue.BooleanValue.of(obj.booleanValue!);
    } else if ('integerValue' in obj) {
      return new fieldValue.IntegerValue(parseInt64(obj.integerValue!));
    } else if ('doubleValue' in obj) {
      if (this.options.useProto3Json) {
        // Proto 3 uses the string values 'NaN' and 'Infinity'.
        if ((obj.doubleValue as {}) === 'NaN') {
          return fieldValue.DoubleValue.NAN;
        } else if ((obj.doubleValue as {}) === 'Infinity') {
          return fieldValue.DoubleValue.POSITIVE_INFINITY;
        } else if ((obj.doubleValue as {}) === '-Infinity') {
          return fieldValue.DoubleValue.NEGATIVE_INFINITY;
        }
      }

      return new fieldValue.DoubleValue(obj.doubleValue!);
    } else if ('stringValue' in obj) {
      return new fieldValue.StringValue(obj.stringValue!);
    } else if ('mapValue' in obj) {
      return this.fromFields(obj.mapValue!.fields || {});
    } else if ('arrayValue' in obj) {
      // "values" is not present if the array is empty
      assertPresent(obj.arrayValue, 'arrayValue');
      const values = obj.arrayValue!.values || [];
      return new fieldValue.ArrayValue(values.map(v => this.fromValue(v)));
    } else if ('timestampValue' in obj) {
      assertPresent(obj.timestampValue, 'timestampValue');
      return new fieldValue.TimestampValue(
        this.fromTimestamp(obj.timestampValue!)
      );
    } else if ('geoPointValue' in obj) {
      assertPresent(obj.geoPointValue, 'geoPointValue');
      const latitude = obj.geoPointValue!.latitude || 0;
      const longitude = obj.geoPointValue!.longitude || 0;
      return new fieldValue.GeoPointValue(new GeoPoint(latitude, longitude));
    } else if ('bytesValue' in obj) {
      assertPresent(obj.bytesValue, 'bytesValue');
      const blob = this.fromBlob(obj.bytesValue!);
      return new fieldValue.BlobValue(blob);
    } else if ('referenceValue' in obj) {
      assertPresent(obj.referenceValue, 'referenceValue');
      const resourceName = this.fromResourceName(obj.referenceValue!);
      const dbId = new DatabaseId(resourceName.get(1), resourceName.get(3));
      const key = new DocumentKey(
        this.extractLocalPathFromResourceName(resourceName)
      );
      return new fieldValue.RefValue(dbId, key);
    } else {
      return fail('Unknown Value proto ' + JSON.stringify(obj));
    }
  }

  /** Creates an api.Document from key and fields (but no create/update time) */
  toMutationDocument(
    key: DocumentKey,
    fields: fieldValue.ObjectValue
  ): api.Document {
    return {
      name: this.toName(key),
      fields: this.toFields(fields)
    };
  }

  toDocument(document: Document): api.Document {
    assert(
      !document.hasLocalMutations,
      "Can't serialize documents with mutations."
    );
    return {
      name: this.toName(document.key),
      fields: this.toFields(document.data),
      updateTime: this.toTimestamp(document.version.toTimestamp())
    };
  }

  fromDocument(
    document: api.Document,
    hasCommittedMutations?: boolean
  ): Document {
    return new Document(
      this.fromName(document.name!),
      this.fromVersion(document.updateTime!),
      this.fromFields(document.fields || {}),
      { hasCommittedMutations: !!hasCommittedMutations }
    );
  }

  toFields(fields: fieldValue.ObjectValue): { [key: string]: api.Value } {
    const result: { [key: string]: api.Value } = {};
    fields.forEach((key, value) => {
      result[key] = this.toValue(value);
    });
    return result;
  }

  fromFields(object: {}): fieldValue.ObjectValue {
    // Proto map<string, Value> gets mapped to Object, so cast it.
    const map = object as { [key: string]: api.Value };
    let result = fieldValue.ObjectValue.EMPTY;
    obj.forEach(map, (key, value) => {
      result = result.set(new FieldPath([key]), this.fromValue(value));
    });
    return result;
  }

  toMapValue(map: fieldValue.ObjectValue): api.MapValue {
    return {
      fields: this.toFields(map)
    };
  }

  toArrayValue(array: fieldValue.ArrayValue): api.ArrayValue {
    const result: api.Value[] = [];
    array.forEach(value => {
      result.push(this.toValue(value));
    });
    return { values: result };
  }

  private fromFound(doc: api.BatchGetDocumentsResponse): Document {
    assert(
      !!doc.found,
      'Tried to deserialize a found document from a missing document.'
    );
    assertPresent(doc.found!.name, 'doc.found.name');
    assertPresent(doc.found!.updateTime, 'doc.found.updateTime');
    const key = this.fromName(doc.found!.name!);
    const version = this.fromVersion(doc.found!.updateTime!);
    const fields = this.fromFields(doc.found!.fields || {});
    return new Document(key, version, fields, {}, doc.found!);
  }

  private fromMissing(result: api.BatchGetDocumentsResponse): NoDocument {
    assert(
      !!result.missing,
      'Tried to deserialize a missing document from a found document.'
    );
    assert(
      !!result.readTime,
      'Tried to deserialize a missing document without a read time.'
    );
    const key = this.fromName(result.missing!);
    const version = this.fromVersion(result.readTime!);
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

  private toWatchTargetChangeState(
    state: WatchTargetChangeState
  ): api.TargetChangeTargetChangeType {
    switch (state) {
      case WatchTargetChangeState.Added:
        return 'ADD';
      case WatchTargetChangeState.Current:
        return 'CURRENT';
      case WatchTargetChangeState.NoChange:
        return 'NO_CHANGE';
      case WatchTargetChangeState.Removed:
        return 'REMOVE';
      case WatchTargetChangeState.Reset:
        return 'RESET';
      default:
        return fail('Unknown WatchTargetChangeState: ' + state);
    }
  }

  toTestWatchChange(watchChange: WatchChange): api.ListenResponse {
    if (watchChange instanceof ExistenceFilterChange) {
      return {
        filter: {
          count: watchChange.existenceFilter.count,
          targetId: watchChange.targetId
        }
      };
    }
    if (watchChange instanceof DocumentWatchChange) {
      if (watchChange.newDoc instanceof Document) {
        const doc = watchChange.newDoc;
        return {
          documentChange: {
            document: {
              name: this.toName(doc.key),
              fields: this.toFields(doc.data),
              updateTime: this.toVersion(doc.version)
            },
            targetIds: watchChange.updatedTargetIds,
            removedTargetIds: watchChange.removedTargetIds
          }
        };
      } else if (watchChange.newDoc instanceof NoDocument) {
        const doc = watchChange.newDoc;
        return {
          documentDelete: {
            document: this.toName(doc.key),
            readTime: this.toVersion(doc.version),
            removedTargetIds: watchChange.removedTargetIds
          }
        };
      } else if (watchChange.newDoc === null) {
        return {
          documentRemove: {
            document: this.toName(watchChange.key),
            removedTargetIds: watchChange.removedTargetIds
          }
        };
      }
    }
    if (watchChange instanceof WatchTargetChange) {
      let cause: api.Status | undefined = undefined;
      if (watchChange.cause) {
        cause = {
          code: mapRpcCodeFromCode(watchChange.cause.code),
          message: watchChange.cause.message
        };
      }
      return {
        targetChange: {
          targetChangeType: this.toWatchTargetChangeState(watchChange.state),
          targetIds: watchChange.targetIds,
          resumeToken: this.unsafeCastProtoByteString(watchChange.resumeToken),
          cause
        }
      };
    }
    return fail('Unrecognized watch change: ' + JSON.stringify(watchChange));
  }

  fromWatchChange(change: api.ListenResponse): WatchChange {
    let watchChange: WatchChange;
    if ('targetChange' in change) {
      assertPresent(change.targetChange, 'targetChange');
      // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
      // if unset
      const state = this.fromWatchTargetChangeState(
        change.targetChange!.targetChangeType || 'NO_CHANGE'
      );
      const targetIds: TargetId[] = change.targetChange!.targetIds || [];
      const resumeToken =
        change.targetChange!.resumeToken || this.emptyByteString();
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
      assertPresent(change.documentChange!.document, 'documentChange.name');
      assertPresent(
        change.documentChange!.document!.name,
        'documentChange.document.name'
      );
      assertPresent(
        change.documentChange!.document!.updateTime,
        'documentChange.document.updateTime'
      );
      const entityChange = change.documentChange!;
      const key = this.fromName(entityChange.document!.name!);
      const version = this.fromVersion(entityChange.document!.updateTime!);
      const fields = this.fromFields(entityChange.document!.fields || {});
      // The document may soon be re-serialized back to protos in order to store it in local
      // persistence. Memoize the encoded form to avoid encoding it again.
      const doc = new Document(
        key,
        version,
        fields,
        {},
        entityChange.document!
      );
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
      assertPresent(change.documentDelete!.document, 'documentDelete.document');
      const docDelete = change.documentDelete!;
      const key = this.fromName(docDelete.document!);
      const version = docDelete.readTime
        ? this.fromVersion(docDelete.readTime)
        : SnapshotVersion.forDeletedDoc();
      const doc = new NoDocument(key, version);
      const removedTargetIds = docDelete.removedTargetIds || [];
      watchChange = new DocumentWatchChange([], removedTargetIds, doc.key, doc);
    } else if ('documentRemove' in change) {
      assertPresent(change.documentRemove, 'documentRemove');
      assertPresent(change.documentRemove!.document, 'documentRemove');
      const docRemove = change.documentRemove!;
      const key = this.fromName(docRemove.document!);
      const removedTargetIds = docRemove.removedTargetIds || [];
      watchChange = new DocumentWatchChange([], removedTargetIds, key, null);
    } else if ('filter' in change) {
      // TODO(dimond): implement existence filter parsing with strategy.
      assertPresent(change.filter, 'filter');
      assertPresent(change.filter!.targetId, 'filter.targetId');
      const filter = change.filter;
      const count = filter!.count || 0;
      const existenceFilter = new ExistenceFilter(count);
      const targetId = filter!.targetId!;
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
      return SnapshotVersion.MIN;
    }
    const targetChange = change.targetChange!;
    if (targetChange.targetIds && targetChange.targetIds.length) {
      return SnapshotVersion.MIN;
    }
    if (!targetChange.readTime) {
      return SnapshotVersion.MIN;
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
      : Precondition.NONE;

    if (proto.update) {
      assertPresent(proto.update.name, 'name');
      const key = this.fromName(proto.update.name!);
      const value = this.fromFields(proto.update.fields || {});
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
      assert(
        precondition.exists === true,
        'Transforms only support precondition "exists == true"'
      );
      return new TransformMutation(key, fieldTransforms);
    } else {
      return fail('unknown mutation proto: ' + JSON.stringify(proto));
    }
  }

  private toPrecondition(precondition: Precondition): api.Precondition {
    assert(!precondition.isNone, "Can't serialize an empty precondition");
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
      return Precondition.NONE;
    }
  }

  private fromWriteResult(
    proto: api.WriteResult,
    commitTime: string
  ): MutationResult {
    // NOTE: Deletes don't have an updateTime.
    const version = proto.updateTime
      ? this.fromVersion(proto.updateTime)
      : this.fromVersion(commitTime);
    let transformResults: fieldValue.FieldValue[] | null = null;
    if (proto.transformResults && proto.transformResults.length > 0) {
      transformResults = proto.transformResults.map(result =>
        this.fromValue(result)
      );
    }
    return new MutationResult(version, transformResults);
  }

  fromWriteResults(
    protos: api.WriteResult[] | undefined,
    commitTime?: string
  ): MutationResult[] {
    if (protos && protos.length > 0) {
      assert(
        commitTime !== undefined,
        'Received a write result without a commit time'
      );
      return protos.map(proto => this.fromWriteResult(proto, commitTime!));
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
          values: transform.elements.map(v => this.toValue(v))
        }
      };
    } else if (transform instanceof ArrayRemoveTransformOperation) {
      return {
        fieldPath: fieldTransform.field.canonicalString(),
        removeAllFromArray: {
          values: transform.elements.map(v => this.toValue(v))
        }
      };
    } else if (transform instanceof NumericIncrementTransformOperation) {
      return {
        fieldPath: fieldTransform.field.canonicalString(),
        increment: this.toValue(transform.operand)
      };
    } else {
      throw fail('Unknown transform: ' + fieldTransform.transform);
    }
  }

  private fromFieldTransform(proto: api.FieldTransform): FieldTransform {
    let transform: TransformOperation | null = null;
    if ('setToServerValue' in proto) {
      assert(
        proto.setToServerValue === 'REQUEST_TIME',
        'Unknown server value transform proto: ' + JSON.stringify(proto)
      );
      transform = ServerTimestampTransform.instance;
    } else if ('appendMissingElements' in proto) {
      const values = proto.appendMissingElements!.values || [];
      transform = new ArrayUnionTransformOperation(
        values.map(v => this.fromValue(v))
      );
    } else if ('removeAllFromArray' in proto) {
      const values = proto.removeAllFromArray!.values || [];
      transform = new ArrayRemoveTransformOperation(
        values.map(v => this.fromValue(v))
      );
    } else if ('increment' in proto) {
      const operand = this.fromValue(proto.increment!);
      assert(
        operand instanceof fieldValue.NumberValue,
        'NUMERIC_ADD transform requires a NumberValue'
      );
      transform = new NumericIncrementTransformOperation(
        operand as fieldValue.NumberValue
      );
    } else {
      fail('Unknown transform proto: ' + JSON.stringify(proto));
    }
    const fieldPath = FieldPath.fromServerFormat(proto.fieldPath!);
    return new FieldTransform(fieldPath, transform!);
  }

  toDocumentsTarget(query: Query): api.DocumentsTarget {
    return { documents: [this.toQueryPath(query.path)] };
  }

  fromDocumentsTarget(documentsTarget: api.DocumentsTarget): Query {
    const count = documentsTarget.documents!.length;
    assert(
      count === 1,
      'DocumentsTarget contained other than 1 document: ' + count
    );
    const name = documentsTarget.documents![0];
    return Query.atPath(this.fromQueryPath(name));
  }

  toQueryTarget(query: Query): api.QueryTarget {
    // Dissect the path into parent, collectionId, and optional key filter.
    const result: api.QueryTarget = { structuredQuery: {} };
    const path = query.path;
    if (query.collectionGroup !== null) {
      assert(
        path.length % 2 === 0,
        'Collection Group queries should be within a document path or root.'
      );
      result.parent = this.toQueryPath(path);
      result.structuredQuery!.from = [
        {
          collectionId: query.collectionGroup,
          allDescendants: true
        }
      ];
    } else {
      assert(
        path.length % 2 !== 0,
        'Document queries with filters are not supported.'
      );
      result.parent = this.toQueryPath(path.popLast());
      result.structuredQuery!.from = [{ collectionId: path.lastSegment() }];
    }

    const where = this.toFilter(query.filters);
    if (where) {
      result.structuredQuery!.where = where;
    }

    const orderBy = this.toOrder(query.orderBy);
    if (orderBy) {
      result.structuredQuery!.orderBy = orderBy;
    }

    const limit = this.toInt32Value(query.limit);
    if (limit !== undefined) {
      result.structuredQuery!.limit = limit;
    }

    if (query.startAt) {
      result.structuredQuery!.startAt = this.toCursor(query.startAt);
    }
    if (query.endAt) {
      result.structuredQuery!.endAt = this.toCursor(query.endAt);
    }

    return result;
  }

  fromQueryTarget(target: api.QueryTarget): Query {
    let path = this.fromQueryPath(target.parent!);

    const query = target.structuredQuery!;
    const fromCount = query.from ? query.from.length : 0;
    let collectionGroup: string | null = null;
    if (fromCount > 0) {
      assert(
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
      limit = this.fromInt32Value(query.limit);
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
      startAt,
      endAt
    );
  }

  toListenRequestLabels(
    queryData: QueryData
  ): api.ApiClientObjectMap<string> | null {
    const value = this.toLabel(queryData.purpose);
    if (value == null) {
      return null;
    } else {
      return {
        'goog-listen-tags': value
      };
    }
  }

  private toLabel(purpose: QueryPurpose): string | null {
    switch (purpose) {
      case QueryPurpose.Listen:
        return null;
      case QueryPurpose.ExistenceFilterMismatch:
        return 'existence-filter-mismatch';
      case QueryPurpose.LimboResolution:
        return 'limbo-document';
      default:
        return fail('Unrecognized query purpose: ' + purpose);
    }
  }

  toTarget(queryData: QueryData): api.Target {
    let result: api.Target;
    const query = queryData.query;

    if (query.isDocumentQuery()) {
      result = { documents: this.toDocumentsTarget(query) };
    } else {
      result = { query: this.toQueryTarget(query) };
    }

    result.targetId = queryData.targetId;

    if (queryData.resumeToken.length > 0) {
      result.resumeToken = this.unsafeCastProtoByteString(
        queryData.resumeToken
      );
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
      values: cursor.position.map(component => this.toValue(component))
    };
  }

  private fromCursor(cursor: api.Cursor): Bound {
    const before = !!cursor.before;
    const position = cursor.values!.map(component => this.fromValue(component));
    return new Bound(position, before);
  }

  // visible for testing
  toDirection(dir: Direction): api.OrderDirection {
    return DIRECTIONS[dir.name];
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
    return OPERATORS[op.name];
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
      this.fromValue(filter.fieldFilter!.value!)
    );
  }

  // visible for testing
  toUnaryOrFieldFilter(filter: FieldFilter): api.Filter {
    if (filter.op === Operator.EQUAL) {
      if (filter.value.isEqual(fieldValue.DoubleValue.NAN)) {
        return {
          unaryFilter: {
            field: this.toFieldPathReference(filter.field),
            op: 'IS_NAN'
          }
        };
      } else if (filter.value.isEqual(fieldValue.NullValue.INSTANCE)) {
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
        value: this.toValue(filter.value)
      }
    };
  }

  fromUnaryFilter(filter: api.Filter): Filter {
    switch (filter.unaryFilter!.op!) {
      case 'IS_NAN':
        const nanField = this.fromFieldPathReference(
          filter.unaryFilter!.field!
        );
        return FieldFilter.create(
          nanField,
          Operator.EQUAL,
          fieldValue.DoubleValue.NAN
        );
      case 'IS_NULL':
        const nullField = this.fromFieldPathReference(
          filter.unaryFilter!.field!
        );
        return FieldFilter.create(
          nullField,
          Operator.EQUAL,
          fieldValue.NullValue.INSTANCE
        );
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
    const fields = paths.map(path => FieldPath.fromServerFormat(path));
    return FieldMask.fromArray(fields);
  }
}

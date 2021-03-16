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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';

import { Blob } from '../../src/api/blob';
import { DocumentReference } from '../../src/api/database';
import { Timestamp } from '../../src/api/timestamp';
import { BundledDocuments } from '../../src/core/bundle';
import { DatabaseId } from '../../src/core/database_info';
import {
  newQueryForPath,
  Query,
  queryToTarget,
  queryWithAddedFilter,
  queryWithAddedOrderBy
} from '../../src/core/query';
import { SnapshotVersion } from '../../src/core/snapshot_version';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  Operator,
  OrderBy
} from '../../src/core/target';
import { TargetId } from '../../src/core/types';
import {
  AddedLimboDocument,
  LimboDocumentChange,
  RemovedLimboDocument,
  View,
  ViewChange
} from '../../src/core/view';
import {
  DeleteFieldValueImpl,
  parseQueryValue,
  parseSetData,
  parseUpdateData,
  UserDataReader
} from '../../src/lite/user_data_reader';
import { LocalViewChanges } from '../../src/local/local_view_changes';
import { TargetData, TargetPurpose } from '../../src/local/target_data';
import {
  DocumentKeySet,
  documentKeySet,
  documentMap,
  DocumentMap
} from '../../src/model/collections';
import {
  compareDocumentsByField,
  Document,
  MutableDocument
} from '../../src/model/document';
import { DocumentComparator } from '../../src/model/document_comparator';
import { DocumentKey } from '../../src/model/document_key';
import { DocumentSet } from '../../src/model/document_set';
import { FieldMask } from '../../src/model/field_mask';
import {
  DeleteMutation,
  MutationResult,
  PatchMutation,
  Precondition,
  SetMutation
} from '../../src/model/mutation';
import { JsonObject, ObjectValue } from '../../src/model/object_value';
import { FieldPath, ResourcePath } from '../../src/model/path';
import { decodeBase64, encodeBase64 } from '../../src/platform/base64';
import {
  NamedQuery as ProtoNamedQuery,
  BundleMetadata as ProtoBundleMetadata,
  LimitType as ProtoLimitType
} from '../../src/protos/firestore_bundle_proto';
import * as api from '../../src/protos/firestore_proto_api';
import { RemoteEvent, TargetChange } from '../../src/remote/remote_event';
import {
  JsonProtoSerializer,
  toDocument,
  toName,
  toQueryTarget,
  toTimestamp,
  toVersion
} from '../../src/remote/serializer';
import {
  DocumentWatchChange,
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../src/remote/watch_change';
import { debugAssert, fail } from '../../src/util/assert';
import { ByteString } from '../../src/util/byte_string';
import { Code, FirestoreError } from '../../src/util/error';
import { primitiveComparator } from '../../src/util/misc';
import { Dict, forEach } from '../../src/util/obj';
import { SortedMap } from '../../src/util/sorted_map';
import { SortedSet } from '../../src/util/sorted_set';
import {
  JSON_SERIALIZER,
  TEST_DATABASE_ID
} from '../unit/local/persistence_test_helpers';

import { FIRESTORE } from './api_helpers';

/* eslint-disable no-restricted-globals */

export type TestSnapshotVersion = number;

export function testUserDataReader(useProto3Json?: boolean): UserDataReader {
  return new UserDataReader(
    TEST_DATABASE_ID,
    /* ignoreUndefinedProperties= */ false,
    useProto3Json !== undefined
      ? new JsonProtoSerializer(TEST_DATABASE_ID, useProto3Json)
      : undefined
  );
}

export function version(v: TestSnapshotVersion): SnapshotVersion {
  const seconds = Math.floor(v / 1e6);
  const nanos = (v % 1e6) * 1e3;
  return SnapshotVersion.fromTimestamp(new Timestamp(seconds, nanos));
}

export function ref(key: string, offset?: number): DocumentReference {
  return DocumentReference.forPath(
    path(key, offset),
    FIRESTORE,
    /* converter= */ null
  );
}

export function doc(
  keyStr: string,
  ver: TestSnapshotVersion,
  jsonOrObjectValue: JsonObject<unknown> | ObjectValue
): MutableDocument {
  return MutableDocument.newFoundDocument(
    key(keyStr),
    version(ver),
    jsonOrObjectValue instanceof ObjectValue
      ? jsonOrObjectValue
      : wrapObject(jsonOrObjectValue)
  );
}

export function deletedDoc(
  keyStr: string,
  ver: TestSnapshotVersion
): MutableDocument {
  return MutableDocument.newNoDocument(key(keyStr), version(ver));
}

export function unknownDoc(
  keyStr: string,
  ver: TestSnapshotVersion
): MutableDocument {
  return MutableDocument.newUnknownDocument(key(keyStr), version(ver));
}

export function removedDoc(keyStr: string): MutableDocument {
  return MutableDocument.newNoDocument(key(keyStr), SnapshotVersion.min());
}

export function invalidDoc(keyStr: string): MutableDocument {
  return MutableDocument.newInvalidDocument(key(keyStr));
}

export function wrap(value: unknown): api.Value {
  // HACK: We use parseQueryValue() since it accepts scalars as well as
  // arrays / objects, and our tests currently use wrap() pretty generically so
  // we don't know the intent.
  return parseQueryValue(testUserDataReader(), 'wrap', value);
}

export function wrapObject(obj: JsonObject<unknown>): ObjectValue {
  return new ObjectValue(wrap(obj) as { mapValue: api.MapValue });
}

export function dbId(project: string, database?: string): DatabaseId {
  return new DatabaseId(project, database);
}

export function key(path: string): DocumentKey {
  return new DocumentKey(new ResourcePath(splitPath(path, '/')));
}

export function keys(...documents: Array<Document | string>): DocumentKeySet {
  let keys = documentKeySet();
  for (const doc of documents) {
    keys = keys.add(typeof doc === 'string' ? key(doc) : doc.key);
  }
  return keys;
}

export function path(path: string, offset?: number): ResourcePath {
  return new ResourcePath(splitPath(path, '/'), offset);
}

export function field(path: string): FieldPath {
  return new FieldPath(path.split('.'));
}

export function mask(...paths: string[]): FieldMask {
  return new FieldMask(paths.map(v => field(v)));
}

export function blob(...bytes: number[]): Blob {
  // bytes can be undefined for the empty blob
  return Blob.fromUint8Array(new Uint8Array(bytes || []));
}

export function filter(path: string, op: string, value: unknown): FieldFilter {
  const dataValue = wrap(value);
  const operator = op as Operator;
  return FieldFilter.create(field(path), operator, dataValue);
}

export function setMutation(
  keyStr: string,
  json: JsonObject<unknown>
): SetMutation {
  const setKey = key(keyStr);
  const parsed = parseSetData(
    testUserDataReader(),
    'setMutation',
    setKey,
    json,
    false
  );
  return new SetMutation(
    setKey,
    parsed.data,
    Precondition.none(),
    parsed.fieldTransforms
  );
}

export function patchMutation(
  keyStr: string,
  json: JsonObject<unknown>,
  precondition?: Precondition
): PatchMutation {
  if (precondition === undefined) {
    precondition = Precondition.exists(true);
  }
  // Replace '<DELETE>' from JSON with FieldValue
  forEach(json, (k, v) => {
    if (v === '<DELETE>') {
      json[k] = new DeleteFieldValueImpl('FieldValue.delete');
    }
  });
  const patchKey = key(keyStr);
  const parsed = parseUpdateData(
    testUserDataReader(),
    'patchMutation',
    patchKey,
    json
  );
  return new PatchMutation(
    patchKey,
    parsed.data,
    parsed.fieldMask,
    precondition,
    parsed.fieldTransforms
  );
}

export function deleteMutation(keyStr: string): DeleteMutation {
  return new DeleteMutation(key(keyStr), Precondition.none());
}

export function mutationResult(
  testVersion: TestSnapshotVersion
): MutationResult {
  return new MutationResult(version(testVersion), /* transformResults= */ []);
}

export function bound(
  values: Array<[string, {}, firestore.OrderByDirection]>,
  before: boolean
): Bound {
  const components: api.Value[] = [];
  for (const value of values) {
    const [_, dataValue] = value;
    components.push(wrap(dataValue));
  }
  return new Bound(components, before);
}

export function query(
  resourcePath: string,
  ...constraints: Array<OrderBy | Filter>
): Query {
  let q = newQueryForPath(path(resourcePath));
  for (const constraint of constraints) {
    if (constraint instanceof Filter) {
      q = queryWithAddedFilter(q, constraint);
    } else {
      q = queryWithAddedOrderBy(q, constraint);
    }
  }
  return q;
}

export function targetData(
  targetId: TargetId,
  queryPurpose: TargetPurpose,
  path: string
): TargetData {
  // Arbitrary value.
  const sequenceNumber = 0;
  return new TargetData(
    queryToTarget(query(path)),
    targetId,
    queryPurpose,
    sequenceNumber
  );
}

export function noChangeEvent(
  targetId: number,
  snapshotVersion: number,
  resumeToken: ByteString = ByteString.EMPTY_BYTE_STRING
): RemoteEvent {
  const aggregator = new WatchChangeAggregator({
    getRemoteKeysForTarget: () => documentKeySet(),
    getTargetDataForTarget: targetId =>
      targetData(targetId, TargetPurpose.Listen, 'foo')
  });
  aggregator.handleTargetChange(
    new WatchTargetChange(
      WatchTargetChangeState.NoChange,
      [targetId],
      resumeToken
    )
  );
  return aggregator.createRemoteEvent(version(snapshotVersion));
}

export function docAddedRemoteEvent(
  docOrDocs: MutableDocument | MutableDocument[],
  updatedInTargets?: TargetId[],
  removedFromTargets?: TargetId[],
  activeTargets?: TargetId[]
): RemoteEvent {
  const docs = Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs];
  debugAssert(docs.length !== 0, 'Cannot pass empty docs array');

  const allTargets = activeTargets
    ? activeTargets
    : (updatedInTargets || []).concat(removedFromTargets || []);

  const aggregator = new WatchChangeAggregator({
    getRemoteKeysForTarget: () => documentKeySet(),
    getTargetDataForTarget: targetId => {
      if (allTargets.indexOf(targetId) !== -1) {
        const collectionPath = docs[0].key.path.popLast();
        return targetData(
          targetId,
          TargetPurpose.Listen,
          collectionPath.toString()
        );
      } else {
        return null;
      }
    }
  });

  let version = SnapshotVersion.min();

  for (const doc of docs) {
    debugAssert(
      !doc.hasLocalMutations,
      "Docs from remote updates shouldn't have local changes."
    );
    const docChange = new DocumentWatchChange(
      updatedInTargets || [],
      removedFromTargets || [],
      doc.key,
      doc
    );
    aggregator.handleDocumentChange(docChange);
    version = doc.version.compareTo(version) > 0 ? doc.version : version;
  }

  return aggregator.createRemoteEvent(version);
}

export function docUpdateRemoteEvent(
  doc: MutableDocument,
  updatedInTargets?: TargetId[],
  removedFromTargets?: TargetId[],
  limboTargets?: TargetId[]
): RemoteEvent {
  debugAssert(
    !doc.hasLocalMutations,
    "Docs from remote updates shouldn't have local changes."
  );
  const docChange = new DocumentWatchChange(
    updatedInTargets || [],
    removedFromTargets || [],
    doc.key,
    doc
  );
  const aggregator = new WatchChangeAggregator({
    getRemoteKeysForTarget: () => keys(doc),
    getTargetDataForTarget: targetId => {
      const purpose =
        limboTargets && limboTargets.indexOf(targetId) !== -1
          ? TargetPurpose.LimboResolution
          : TargetPurpose.Listen;
      return targetData(targetId, purpose, doc.key.toString());
    }
  });
  aggregator.handleDocumentChange(docChange);
  return aggregator.createRemoteEvent(doc.version);
}

export class TestBundledDocuments {
  constructor(public documents: BundledDocuments, public bundleName: string) {}
}

export function bundledDocuments(
  documents: MutableDocument[],
  queryNames?: string[][],
  bundleName?: string
): TestBundledDocuments {
  const result = documents.map((d, index) => {
    return {
      metadata: {
        name: toName(JSON_SERIALIZER, d.key),
        readTime: toVersion(JSON_SERIALIZER, d.version),
        exists: d.isFoundDocument(),
        queries: queryNames ? queryNames[index] : undefined
      },
      document: d.isFoundDocument() ? toDocument(JSON_SERIALIZER, d) : undefined
    };
  });

  return new TestBundledDocuments(result, bundleName || '');
}

export class TestNamedQuery {
  constructor(
    public namedQuery: ProtoNamedQuery,
    public matchingDocuments: DocumentKeySet
  ) {}
}

export function namedQuery(
  name: string,
  query: Query,
  limitType: ProtoLimitType,
  readTime: SnapshotVersion,
  matchingDocuments: DocumentKeySet = documentKeySet()
): TestNamedQuery {
  return {
    namedQuery: {
      name,
      readTime: toTimestamp(JSON_SERIALIZER, readTime.toTimestamp()),
      bundledQuery: {
        parent: toQueryTarget(JSON_SERIALIZER, queryToTarget(query)).parent,
        limitType,
        structuredQuery: toQueryTarget(JSON_SERIALIZER, queryToTarget(query))
          .structuredQuery
      }
    },
    matchingDocuments
  };
}

export function bundleMetadata(
  id: string,
  createTime: TestSnapshotVersion,
  version = 1,
  totalDocuments = 1,
  totalBytes = 1000
): ProtoBundleMetadata {
  return {
    id,
    createTime: { seconds: createTime, nanos: 0 },
    version,
    totalDocuments,
    totalBytes
  };
}

export function updateMapping(
  snapshotVersion: SnapshotVersion,
  added: Array<MutableDocument | string>,
  modified: Array<MutableDocument | string>,
  removed: Array<MutableDocument | string>,
  current?: boolean
): TargetChange {
  let addedDocuments = documentKeySet();
  let modifiedDocuments = documentKeySet();
  let removedDocuments = documentKeySet();

  added.forEach(docOrKey => {
    const k =
      docOrKey instanceof MutableDocument ? docOrKey.key : key(docOrKey);
    addedDocuments = addedDocuments.add(k);
  });
  modified.forEach(docOrKey => {
    const k =
      docOrKey instanceof MutableDocument ? docOrKey.key : key(docOrKey);
    modifiedDocuments = modifiedDocuments.add(k);
  });
  removed.forEach(docOrKey => {
    const k =
      docOrKey instanceof MutableDocument ? docOrKey.key : key(docOrKey);
    removedDocuments = removedDocuments.add(k);
  });

  return new TargetChange(
    resumeTokenForSnapshot(snapshotVersion),
    !!current,
    addedDocuments,
    modifiedDocuments,
    removedDocuments
  );
}

export function addTargetMapping(
  ...docsOrKeys: Array<MutableDocument | string>
): TargetChange {
  return updateMapping(
    SnapshotVersion.min(),
    docsOrKeys,
    [],
    [],
    /* current= */ false
  );
}

export function ackTarget(
  ...docsOrKeys: Array<MutableDocument | string>
): TargetChange {
  return updateMapping(
    SnapshotVersion.min(),
    docsOrKeys,
    [],
    [],
    /* current= */ true
  );
}

export function limboChanges(changes: {
  added?: Document[];
  removed?: Document[];
}): LimboDocumentChange[] {
  changes.added = changes.added || [];
  changes.removed = changes.removed || [];
  const result: LimboDocumentChange[] = [];
  for (const removed of changes.removed) {
    result.push(new RemovedLimboDocument(removed.key));
  }
  for (const added of changes.added) {
    result.push(new AddedLimboDocument(added.key));
  }
  return result;
}

export function localViewChanges(
  targetId: TargetId,
  fromCache: boolean,
  changes: { added?: string[]; removed?: string[] }
): LocalViewChanges {
  if (!changes.added) {
    changes.added = [];
  }
  if (!changes.removed) {
    changes.removed = [];
  }

  let addedKeys = documentKeySet();
  let removedKeys = documentKeySet();

  changes.added.forEach(keyStr => (addedKeys = addedKeys.add(key(keyStr))));

  changes.removed.forEach(
    keyStr => (removedKeys = removedKeys.add(key(keyStr)))
  );

  return new LocalViewChanges(targetId, fromCache, addedKeys, removedKeys);
}

/**
 * Returns a ByteString representation for the platform from the given string.
 */
export function byteStringFromString(value: string): ByteString {
  const base64 = encodeBase64(value);
  return ByteString.fromBase64String(base64);
}

/**
 * Decodes a base 64 decoded string.
 *
 * Note that this is typed to accept Uint8Arrays to match the types used
 * by the spec tests. Since the spec tests only use JSON strings, this method
 * throws if an Uint8Array is passed.
 */
export function stringFromBase64String(value?: string | Uint8Array): string {
  debugAssert(
    value === undefined || typeof value === 'string',
    'Can only decode base64 encoded strings'
  );
  return decodeBase64(value ?? '');
}

/** Creates a resume token to match the given snapshot version. */
export function resumeTokenForSnapshot(
  snapshotVersion: SnapshotVersion
): ByteString {
  if (snapshotVersion.isEqual(SnapshotVersion.min())) {
    return ByteString.EMPTY_BYTE_STRING;
  } else {
    return byteStringFromString(snapshotVersion.toString());
  }
}

export function orderBy(path: string, op?: string): OrderBy {
  op = op || 'asc';
  debugAssert(op === 'asc' || op === 'desc', 'Unknown direction: ' + op);
  const dir: Direction =
    op === 'asc' ? Direction.ASCENDING : Direction.DESCENDING;
  return new OrderBy(field(path), dir);
}

function splitPath(path: string, splitChar: string): string[] {
  if (path === '') {
    return [];
  } else {
    return path.split(splitChar);
  }
}

/**
 * Converts a sorted map to an array with inorder traversal
 */
export function mapAsArray<K, V>(
  sortedMap: SortedMap<K, V>
): Array<{ key: K; value: V }> {
  const result: Array<{ key: K; value: V }> = [];
  sortedMap.inorderTraversal((key: K, value: V) => {
    result.push({ key, value });
  });
  return result;
}

/**
 * Converts a list of documents or document keys to a sorted map. A document
 * key is used to represent a deletion and maps to null.
 */
export function documentUpdates(
  ...docsOrKeys: Array<Document | DocumentKey>
): DocumentMap {
  let changes = documentMap();
  for (const docOrKey of docsOrKeys) {
    if (docOrKey instanceof MutableDocument) {
      changes = changes.insert(docOrKey.key, docOrKey);
    } else if (docOrKey instanceof DocumentKey) {
      changes = changes.insert(
        docOrKey,
        MutableDocument.newNoDocument(docOrKey, SnapshotVersion.min())
      );
    }
  }
  return changes;
}

/**
 * Short for view.applyChanges(view.computeDocChanges(documentUpdates(docs))).
 */
export function applyDocChanges(
  view: View,
  ...docsOrKeys: Array<Document | DocumentKey>
): ViewChange {
  const changes = view.computeDocChanges(documentUpdates(...docsOrKeys));
  return view.applyChanges(changes, true);
}

/**
 * Constructs a document set.
 */
export function documentSet(
  comp: DocumentComparator,
  ...docs: Document[]
): DocumentSet;
export function documentSet(...docs: Document[]): DocumentSet;
export function documentSet(...args: unknown[]): DocumentSet {
  let docSet: DocumentSet | null = null;
  if (args[0] instanceof Function) {
    docSet = new DocumentSet(args[0] as DocumentComparator);
    args = args.slice(1);
  } else {
    docSet = new DocumentSet();
  }
  for (const doc of args) {
    debugAssert(
      doc instanceof MutableDocument,
      'Bad argument, expected Document: ' + doc
    );
    docSet = docSet.add(doc);
  }
  return docSet;
}

/**
 * Constructs a document key set.
 */
export function keySet(...keys: DocumentKey[]): DocumentKeySet {
  let keySet = documentKeySet();
  for (const key of keys) {
    keySet = keySet.add(key);
  }
  return keySet;
}

/** Converts a DocumentSet to an array. */
export function documentSetAsArray(docs: DocumentSet): Document[] {
  const result: Document[] = [];
  docs.forEach((doc: Document) => {
    result.push(doc);
  });
  return result;
}

export class DocComparator {
  static byField(...fields: string[]): DocumentComparator {
    const path = new FieldPath(fields);
    return (doc1, doc2) => compareDocumentsByField(path, doc1, doc2);
  }
}

/**
 * Two helper functions to simplify testing isEqual() method.
 */
// Use any, so we can dynamically call .isEqual().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectEqual(left: any, right: any, message?: string): void {
  message = message || '';
  if (typeof left.isEqual !== 'function') {
    return fail(
      JSON.stringify(left) + ' does not support isEqual (left) ' + message
    );
  }
  if (typeof right.isEqual !== 'function') {
    return fail(
      JSON.stringify(right) + ' does not support isEqual (right) ' + message
    );
  }
  expect(left.isEqual(right)).to.equal(true, message);
  expect(right.isEqual(left)).to.equal(true, message);
}

// Use any, so we can dynamically call .isEqual().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectNotEqual(left: any, right: any, message?: string): void {
  expect(left.isEqual(right)).to.equal(false, message || '');
  expect(right.isEqual(left)).to.equal(false, message || '');
}

export function expectEqualArrays(
  left: unknown[],
  right: unknown[],
  message?: string
): void {
  message = message ? ' ' + message : '';
  expect(left.length).to.deep.equal(
    right.length,
    'different array lengths' + message
  );
  for (let i = 0; i < left.length; i++) {
    expectEqual(left[i], right[i], 'for index ' + i + message);
  }
}

/**
 * Checks that an ordered array of elements yields the correct pair-wise
 * comparison result for the supplied comparator
 */
export function expectCorrectComparisons<T extends unknown>(
  array: T[],
  comp: (left: T, right: T) => number
): void {
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length; j++) {
      const desc =
        'comparing ' +
        JSON.stringify(array[i]) +
        ' to ' +
        JSON.stringify(array[j]) +
        ' at (' +
        i +
        ', ' +
        j +
        ')';
      expect(comp(array[i], array[j])).to.equal(
        primitiveComparator(i, j),
        desc
      );
    }
  }
}

/**
 * Takes an array of "equality group" arrays and asserts that the comparator
 * returns the same as comparing the indexes of the "equality groups"
 * (0 for items in the same group).
 */
export function expectCorrectComparisonGroups<T extends unknown>(
  groups: T[][],
  comp: (left: T, right: T) => number
): void {
  for (let i = 0; i < groups.length; i++) {
    for (const left of groups[i]) {
      for (let j = 0; j < groups.length; j++) {
        for (const right of groups[j]) {
          expect(comp(left, right)).to.equal(
            primitiveComparator(i, j),
            'comparing ' +
              JSON.stringify(left) +
              ' to ' +
              JSON.stringify(right) +
              ' at (' +
              i +
              ', ' +
              j +
              ')'
          );

          expect(comp(right, left)).to.equal(
            primitiveComparator(j, i),
            'comparing ' +
              JSON.stringify(right) +
              ' to ' +
              JSON.stringify(left) +
              ' at (' +
              j +
              ', ' +
              i +
              ')'
          );
        }
      }
    }
  }
}

/** Compares SortedSet to an array */
export function expectSetToEqual<T>(set: SortedSet<T>, arr: T[]): void {
  expect(set.size).to.equal(arr.length);
  const results: T[] = [];
  set.forEach(elem => results.push(elem));
  expect(results).to.deep.equal(arr);
}

/**
 * Takes an array of array of elements and compares each of the elements
 * to every other element.
 *
 * Elements in the same inner array are expect to be equal with regard to
 * the provided equality function to all other elements from the same array
 * (including itself) and unequal to all other elements from the other array
 */
export function expectEqualitySets<T>(
  elems: T[][],
  equalityFn: (v1: T, v2: T) => boolean,
  stringifyFn?: (v: T) => string
): void {
  for (let i = 0; i < elems.length; i++) {
    const currentElems = elems[i];
    // compare all elems within the nested array
    for (const elem of currentElems) {
      // compare to all other values
      for (let j = 0; j < elems.length; j++) {
        // same outer index <=> equality should be true
        const expectedComparison = i === j;
        for (const otherElem of elems[j]) {
          expect(equalityFn(elem, otherElem)).to.equal(
            expectedComparison,
            'Expected (' +
              (stringifyFn ? stringifyFn(elem) : elem) +
              ').isEqual(' +
              (stringifyFn ? stringifyFn(otherElem) : otherElem) +
              ').to.equal(' +
              expectedComparison +
              ')'
          );
        }
      }
    }
  }
}

export function validateFirestoreError(
  expectedCode: Code,
  actualError: Error
): void {
  expect(actualError.name).to.equal('FirebaseError');
  expect((actualError as FirestoreError).code).to.equal(expectedCode);
}

export function forEachNumber<V>(
  obj: Dict<V>,
  fn: (key: number, val: V) => void
): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const num = Number(key);
      if (!isNaN(num)) {
        fn(num, obj[key]);
      }
    }
  }
}

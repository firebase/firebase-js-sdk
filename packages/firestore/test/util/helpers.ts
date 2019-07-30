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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';

import { Blob } from '../../src/api/blob';
import { fromDotSeparatedString } from '../../src/api/field_path';
import { FieldValueImpl } from '../../src/api/field_value';
import {
  DocumentKeyReference,
  UserDataConverter
} from '../../src/api/user_data_converter';
import { DatabaseId } from '../../src/core/database_info';
import {
  Bound,
  Direction,
  FieldFilter,
  Operator,
  OrderBy
} from '../../src/core/query';
import { SnapshotVersion } from '../../src/core/snapshot_version';
import { ProtoByteString, TargetId } from '../../src/core/types';
import {
  AddedLimboDocument,
  LimboDocumentChange,
  RemovedLimboDocument,
  View,
  ViewChange
} from '../../src/core/view';
import { LocalViewChanges } from '../../src/local/local_view_changes';
import { QueryData, QueryPurpose } from '../../src/local/query_data';
import {
  DocumentKeySet,
  documentKeySet,
  MaybeDocumentMap,
  maybeDocumentMap
} from '../../src/model/collections';
import {
  Document,
  DocumentOptions,
  MaybeDocument,
  NoDocument,
  UnknownDocument
} from '../../src/model/document';
import { DocumentComparator } from '../../src/model/document_comparator';
import { DocumentKey } from '../../src/model/document_key';
import { DocumentSet } from '../../src/model/document_set';
import {
  FieldValue,
  JsonObject,
  ObjectValue
} from '../../src/model/field_value';
import {
  DeleteMutation,
  FieldMask,
  MutationResult,
  PatchMutation,
  Precondition,
  SetMutation,
  TransformMutation
} from '../../src/model/mutation';
import { FieldPath, ResourcePath } from '../../src/model/path';
import { emptyByteString } from '../../src/platform/platform';
import { RemoteEvent, TargetChange } from '../../src/remote/remote_event';
import {
  DocumentWatchChange,
  WatchChangeAggregator
} from '../../src/remote/watch_change';
import { assert, fail } from '../../src/util/assert';
import { primitiveComparator } from '../../src/util/misc';
import { Dict, forEach } from '../../src/util/obj';
import { SortedMap } from '../../src/util/sorted_map';
import { SortedSet } from '../../src/util/sorted_set';
import { query } from './api_helpers';

export type TestSnapshotVersion = number;

/**
 * A string sentinel that can be used with patchMutation() to mark a field for
 * deletion.
 */
export const DELETE_SENTINEL = '<DELETE>';

const preConverter = (input: unknown): unknown => {
  return input === DELETE_SENTINEL ? FieldValueImpl.delete() : input;
};

const dataConverter = new UserDataConverter(preConverter);

export function version(v: TestSnapshotVersion): SnapshotVersion {
  return SnapshotVersion.fromMicroseconds(v);
}

export function ref(
  dbIdStr: string,
  keyStr: string,
  offset?: number
): DocumentKeyReference {
  const [project, database] = dbIdStr.split('/', 2);
  const dbId = new DatabaseId(project, database);
  return new DocumentKeyReference(dbId, new DocumentKey(path(keyStr, offset)));
}

export function doc(
  keyStr: string,
  ver: TestSnapshotVersion,
  json: JsonObject<unknown>,
  options: DocumentOptions = {}
): Document {
  return new Document(key(keyStr), version(ver), wrapObject(json), options);
}

export function deletedDoc(
  keyStr: string,
  ver: TestSnapshotVersion,
  options: DocumentOptions = {}
): NoDocument {
  return new NoDocument(key(keyStr), version(ver), options);
}

export function unknownDoc(
  keyStr: string,
  ver: TestSnapshotVersion
): UnknownDocument {
  return new UnknownDocument(key(keyStr), version(ver));
}

export function removedDoc(keyStr: string): NoDocument {
  return new NoDocument(key(keyStr), SnapshotVersion.forDeletedDoc());
}

export function wrap(value: unknown): FieldValue {
  // HACK: We use parseQueryValue() since it accepts scalars as well as
  // arrays / objects, and our tests currently use wrap() pretty generically so
  // we don't know the intent.
  return dataConverter.parseQueryValue('wrap', value);
}

export function wrapObject(obj: JsonObject<unknown>): ObjectValue {
  // Cast is safe here because value passed in is a map
  return wrap(obj) as ObjectValue;
}

export function dbId(project: string, database?: string): DatabaseId {
  return new DatabaseId(project, database);
}

export function key(path: string): DocumentKey {
  return new DocumentKey(new ResourcePath(splitPath(path, '/')));
}

export function keys(
  ...documents: Array<MaybeDocument | string>
): DocumentKeySet {
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
  return fromDotSeparatedString(path)._internalPath;
}

export function mask(...paths: string[]): FieldMask {
  let fieldPaths = new SortedSet<FieldPath>(FieldPath.comparator);
  for (const path of paths) {
    fieldPaths = fieldPaths.add(field(path));
  }
  return FieldMask.fromSet(fieldPaths);
}

export function blob(...bytes: number[]): Blob {
  // bytes can be undefined for the empty blob
  return Blob.fromUint8Array(new Uint8Array(bytes || []));
}

export function filter(path: string, op: string, value: unknown): FieldFilter {
  const dataValue = wrap(value);
  const operator = Operator.fromString(op);
  const filter = FieldFilter.create(field(path), operator, dataValue);

  if (filter instanceof FieldFilter) {
    return filter;
  } else {
    return fail('Unrecognized filter: ' + JSON.stringify(filter));
  }
}

export function setMutation(
  keyStr: string,
  json: JsonObject<unknown>
): SetMutation {
  return new SetMutation(key(keyStr), wrapObject(json), Precondition.NONE);
}

export function patchMutation(
  keyStr: string,
  json: JsonObject<unknown>,
  precondition?: Precondition
): PatchMutation {
  if (precondition === undefined) {
    precondition = Precondition.exists(true);
  }

  const parsed = dataConverter.parseUpdateData('patchMutation', json);
  return new PatchMutation(
    key(keyStr),
    parsed.data,
    parsed.fieldMask,
    precondition
  );
}

export function deleteMutation(keyStr: string): DeleteMutation {
  return new DeleteMutation(key(keyStr), Precondition.NONE);
}

/**
 * Creates a TransformMutation by parsing any FieldValue sentinels in the
 * provided data. The data is expected to use dotted-notation for nested fields
 * (i.e. { "foo.bar": FieldValue.foo() } and must not contain any non-sentinel
 * data.
 */
export function transformMutation(
  keyStr: string,
  data: Dict<unknown>
): TransformMutation {
  const result = dataConverter.parseUpdateData('transformMutation()', data);
  return new TransformMutation(key(keyStr), result.fieldTransforms);
}

export function mutationResult(
  testVersion: TestSnapshotVersion
): MutationResult {
  return new MutationResult(version(testVersion), /* transformResults= */ null);
}

export function bound(
  values: Array<[string, {}, firestore.OrderByDirection]>,
  before: boolean
): Bound {
  const components: FieldValue[] = [];
  for (const value of values) {
    const [_, dataValue] = value;
    components.push(wrap(dataValue));
  }
  return new Bound(components, before);
}

export function queryData(
  targetId: TargetId,
  queryPurpose: QueryPurpose,
  path: string
): QueryData {
  // Arbitrary value.
  const sequenceNumber = 0;
  return new QueryData(
    query(path)._query,
    targetId,
    queryPurpose,
    sequenceNumber
  );
}

export function docAddedRemoteEvent(
  doc: MaybeDocument,
  updatedInTargets?: TargetId[],
  removedFromTargets?: TargetId[],
  limboTargets?: TargetId[]
): RemoteEvent {
  assert(
    !(doc instanceof Document) || !doc.hasLocalMutations,
    "Docs from remote updates shouldn't have local changes."
  );
  const docChange = new DocumentWatchChange(
    updatedInTargets || [],
    removedFromTargets || [],
    doc.key,
    doc
  );
  const aggregator = new WatchChangeAggregator({
    getRemoteKeysForTarget: () => documentKeySet(),
    getQueryDataForTarget: targetId => {
      const purpose =
        limboTargets && limboTargets.indexOf(targetId) !== -1
          ? QueryPurpose.LimboResolution
          : QueryPurpose.Listen;
      return queryData(targetId, purpose, doc.key.toString());
    }
  });
  aggregator.handleDocumentChange(docChange);
  return aggregator.createRemoteEvent(doc.version);
}

export function docUpdateRemoteEvent(
  doc: MaybeDocument,
  updatedInTargets?: TargetId[],
  removedFromTargets?: TargetId[],
  limboTargets?: TargetId[]
): RemoteEvent {
  assert(
    !(doc instanceof Document) || !doc.hasLocalMutations,
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
    getQueryDataForTarget: targetId => {
      const purpose =
        limboTargets && limboTargets.indexOf(targetId) !== -1
          ? QueryPurpose.LimboResolution
          : QueryPurpose.Listen;
      return queryData(targetId, purpose, doc.key.toString());
    }
  });
  aggregator.handleDocumentChange(docChange);
  return aggregator.createRemoteEvent(doc.version);
}

export function updateMapping(
  snapshotVersion: SnapshotVersion,
  added: Array<Document | string>,
  modified: Array<Document | string>,
  removed: Array<MaybeDocument | string>,
  current?: boolean
): TargetChange {
  let addedDocuments = documentKeySet();
  let modifiedDocuments = documentKeySet();
  let removedDocuments = documentKeySet();

  added.forEach(docOrKey => {
    const k = docOrKey instanceof Document ? docOrKey.key : key(docOrKey);
    addedDocuments = addedDocuments.add(k);
  });
  modified.forEach(docOrKey => {
    const k = docOrKey instanceof Document ? docOrKey.key : key(docOrKey);
    modifiedDocuments = modifiedDocuments.add(k);
  });
  removed.forEach(docOrKey => {
    const k = docOrKey instanceof MaybeDocument ? docOrKey.key : key(docOrKey);
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
  ...docsOrKeys: Array<Document | string>
): TargetChange {
  return updateMapping(
    SnapshotVersion.MIN,
    docsOrKeys,
    [],
    [],
    /* current= */ false
  );
}

export function ackTarget(
  ...docsOrKeys: Array<Document | string>
): TargetChange {
  return updateMapping(
    SnapshotVersion.MIN,
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

  return new LocalViewChanges(targetId, addedKeys, removedKeys);
}

/** Creates a resume token to match the given snapshot version. */
export function resumeTokenForSnapshot(
  snapshotVersion: SnapshotVersion
): ProtoByteString {
  if (snapshotVersion.isEqual(SnapshotVersion.MIN)) {
    return emptyByteString();
  } else {
    return snapshotVersion.toString();
  }
}

export function orderBy(path: string, op?: string): OrderBy {
  op = op || 'asc';
  assert(op === 'asc' || op === 'desc', 'Unknown direction: ' + op);
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
): MaybeDocumentMap {
  let changes = maybeDocumentMap();
  for (const docOrKey of docsOrKeys) {
    if (docOrKey instanceof Document) {
      changes = changes.insert(docOrKey.key, docOrKey);
    } else if (docOrKey instanceof DocumentKey) {
      changes = changes.insert(
        docOrKey,
        new NoDocument(docOrKey, SnapshotVersion.forDeletedDoc())
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
    assert(doc instanceof Document, 'Bad argument, expected Document: ' + doc);
    docSet = docSet.add(doc as Document);
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
    return Document.compareByField.bind(this, path);
  }
}

/**
 * Two helper functions to simplify testing isEqual() method.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, so we can dynamically call .isEqual().
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, so we can dynamically call .isEqual().
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
  equalityFn: (v1: T, v2: T) => boolean
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
              elem +
              ').isEqual(' +
              otherElem +
              ').to.equal(' +
              expectedComparison +
              ')'
          );
        }
      }
    }
  }
}

/** Returns the number of keys in this object. */
export function size(obj: JsonObject<unknown>): number {
  let c = 0;
  forEach(obj, () => c++);
  return c;
}

export function expectFirestoreError(err: Error): void {
  expect(err.name).to.equal('FirebaseError');
}

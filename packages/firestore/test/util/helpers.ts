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

import { expect } from 'chai';
import * as firestore from '@firebase/firestore-types';

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
  fieldFilter,
  Filter,
  OrderBy,
  Query,
  RelationOp
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
import { QueryData } from '../../src/local/query_data';
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
  NoDocument
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
  FieldTransform,
  MutationResult,
  PatchMutation,
  Precondition,
  ServerTimestampTransform,
  SetMutation,
  TransformMutation
} from '../../src/model/mutation';
import { FieldPath, ResourcePath } from '../../src/model/path';
import { emptyByteString } from '../../src/platform/platform';
import {
  CurrentStatusUpdate,
  RemoteEvent,
  TargetChange,
  UpdateMapping
} from '../../src/remote/remote_event';
import {
  DocumentWatchChange,
  WatchChangeAggregator
} from '../../src/remote/watch_change';
import { assert, fail } from '../../src/util/assert';
import { AnyJs, primitiveComparator } from '../../src/util/misc';
import { forEach } from '../../src/util/obj';
import { SortedMap } from '../../src/util/sorted_map';
import { SortedSet } from '../../src/util/sorted_set';

export type TestSnapshotVersion = number;

/**
 * A string sentinel that can be used with patchMutation() to mark a field for
 * deletion.
 */
export const DELETE_SENTINEL = '<DELETE>';

const preConverter = (input: AnyJs) => {
  return input === DELETE_SENTINEL ? FieldValueImpl.delete() : input;
};

const dataConverter = new UserDataConverter(preConverter);

export function version(v: TestSnapshotVersion): SnapshotVersion {
  return SnapshotVersion.fromMicroseconds(v);
}

export function ref(dbIdStr: string, keyStr: string): DocumentKeyReference {
  const [project, database] = dbIdStr.split('/', 2);
  const dbId = new DatabaseId(project, database);
  return new DocumentKeyReference(dbId, key(keyStr));
}

export function doc(
  keyStr: string,
  ver: TestSnapshotVersion,
  json: JsonObject<AnyJs>,
  options: DocumentOptions = {
    hasLocalMutations: false
  }
): Document {
  return new Document(key(keyStr), version(ver), wrapObject(json), options);
}

export function deletedDoc(
  keyStr: string,
  ver: TestSnapshotVersion
): NoDocument {
  return new NoDocument(key(keyStr), version(ver));
}

export function wrap(value: AnyJs): FieldValue {
  // HACK: We use parseQueryValue() since it accepts scalars as well as
  // arrays / objects, and our tests currently use wrap() pretty generically so
  // we don't know the intent.
  return dataConverter.parseQueryValue('wrap', value);
}

export function wrapObject(obj: JsonObject<AnyJs>): ObjectValue {
  // Cast is safe here because value passed in is a map
  return wrap(obj) as ObjectValue;
}

export function dbId(project: string, database?: string): DatabaseId {
  return new DatabaseId(project, database);
}

export function key(path: string): DocumentKey {
  return new DocumentKey(new ResourcePath(splitPath(path, '/')));
}

export function path(path: string): ResourcePath {
  return new ResourcePath(splitPath(path, '/'));
}

export function field(path: string): FieldPath {
  return fromDotSeparatedString(path)._internalPath;
}

export function blob(...bytes: number[]): Blob {
  // bytes can be undefined for the empty blob
  return Blob.fromUint8Array(new Uint8Array(bytes || []));
}

export function filter(path: string, op: string, value: AnyJs): Filter {
  const dataValue = wrap(value);
  const operator = RelationOp.fromString(op);
  return fieldFilter(field(path), operator, dataValue);
}

export function setMutation(
  keyStr: string,
  json: JsonObject<AnyJs>
): SetMutation {
  return new SetMutation(key(keyStr), wrapObject(json), Precondition.NONE);
}

export function patchMutation(
  keyStr: string,
  json: JsonObject<AnyJs>,
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

// For now this only creates TransformMutations with server timestamps.
export function transformMutation(
  keyStr: string,
  serverTimestampFields: string[]
): TransformMutation {
  return new TransformMutation(
    key(keyStr),
    serverTimestampFields.map(
      field =>
        new FieldTransform(
          fromDotSeparatedString(field)._internalPath,
          ServerTimestampTransform.instance
        )
    )
  );
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

export function docUpdateRemoteEvent(
  doc: MaybeDocument,
  updatedInTargets?: TargetId[],
  removedFromTargets?: TargetId[]
): RemoteEvent {
  assert(
    !(doc instanceof Document) || !doc.hasLocalMutations,
    "Docs from remote updates shouldn't have local changes."
  );
  if (updatedInTargets === undefined) updatedInTargets = [];
  if (removedFromTargets === undefined) removedFromTargets = [];
  const docChange = new DocumentWatchChange(
    updatedInTargets,
    removedFromTargets,
    doc.key,
    doc
  );
  const listens: { [targetId: number]: QueryData } = {};
  for (const targetId of updatedInTargets.concat(removedFromTargets)) {
    listens[targetId] = {} as QueryData;
  }
  const aggregator = new WatchChangeAggregator(doc.version, listens, {});
  aggregator.add(docChange);
  const event = aggregator.createRemoteEvent();
  return event;
}

export function addTargetMapping(
  ...docsOrKeys: Array<Document | string>
): TargetChange {
  const mapping = new UpdateMapping();
  for (const docOrKey of docsOrKeys) {
    const k = docOrKey instanceof Document ? docOrKey.key : key(docOrKey);
    mapping.addedDocuments = mapping.addedDocuments.add(k);
  }
  return {
    mapping,
    snapshotVersion: SnapshotVersion.MIN,
    resumeToken: emptyByteString(),
    currentStatusUpdate: CurrentStatusUpdate.None
  };
}

export function ackTarget(
  ...docsOrKeys: Array<Document | string>
): TargetChange {
  const targetChange = addTargetMapping(...docsOrKeys);
  return {
    mapping: targetChange.mapping,
    snapshotVersion: targetChange.snapshotVersion,
    resumeToken: emptyByteString(),
    currentStatusUpdate: CurrentStatusUpdate.MarkCurrent
  };
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
  query: Query,
  changes: { added?: string[]; removed?: string[] }
): LocalViewChanges {
  if (!changes.added) changes.added = [];
  if (!changes.removed) changes.removed = [];

  let addedKeys = documentKeySet();
  let removedKeys = documentKeySet();

  changes.added.forEach(keyStr => (addedKeys = addedKeys.add(key(keyStr))));

  changes.removed.forEach(
    keyStr => (removedKeys = removedKeys.add(key(keyStr)))
  );

  return new LocalViewChanges(query, addedKeys, removedKeys);
}

export function updateMapping(
  added: Document[],
  removed: Document[]
): UpdateMapping {
  const update = new UpdateMapping();
  added.forEach(doc => update.add(doc.key));
  removed.forEach(doc => update.delete(doc.key));
  return update;
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
  return view.applyChanges(changes);
}

/**
 * Constructs a document set.
 */
export function documentSet(
  comp: DocumentComparator,
  ...docs: Document[]
): DocumentSet;
export function documentSet(...docs: Document[]): DocumentSet;
export function documentSet(...args: AnyJs[]): DocumentSet {
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
// tslint:disable-next-line:no-any so we can dynamically call .isEqual().
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

// tslint:disable-next-line:no-any so we can dynamically call .isEqual().
export function expectNotEqual(left: any, right: any, message?: string): void {
  expect(left.isEqual(right)).to.equal(false, message || '');
  expect(right.isEqual(left)).to.equal(false, message || '');
}

export function expectEqualArrays(
  left: AnyJs[],
  right: AnyJs[],
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
export function expectCorrectComparisons(
  array: AnyJs[],
  comp: (left: AnyJs, right: AnyJs) => number
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
export function expectCorrectComparisonGroups(
  groups: AnyJs[][],
  comp: (left: AnyJs, right: AnyJs) => number
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
export function size(obj: JsonObject<AnyJs>): number {
  let c = 0;
  forEach(obj, () => c++);
  return c;
}

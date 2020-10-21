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
import * as api from '../../src/protos/firestore_proto_api';
import { Blob } from '../../src/api/blob';
import { UserDataWriter } from '../../src/api/user_data_writer';
import { UserDataReader } from '../../src/api/user_data_reader';
import { DatabaseId } from '../../src/core/database_info';
import { Bound, FieldFilter, Filter, OrderBy, Query } from '../../src/core/query';
import { SnapshotVersion } from '../../src/core/snapshot_version';
import { TargetId } from '../../src/core/types';
import { LimboDocumentChange, View, ViewChange } from '../../src/core/view';
import { LocalViewChanges } from '../../src/local/local_view_changes';
import { TargetData, TargetPurpose } from '../../src/local/target_data';
import { DocumentKeySet, MaybeDocumentMap } from '../../src/model/collections';
import { Document, DocumentOptions, MaybeDocument, NoDocument, UnknownDocument } from '../../src/model/document';
import { DocumentComparator } from '../../src/model/document_comparator';
import { DocumentKey } from '../../src/model/document_key';
import { DocumentSet } from '../../src/model/document_set';
import { JsonObject, ObjectValue } from '../../src/model/object_value';
import { DeleteMutation, FieldMask, MutationResult, PatchMutation, Precondition, SetMutation, TransformMutation } from '../../src/model/mutation';
import { FieldPath, ResourcePath } from '../../src/model/path';
import { RemoteEvent, TargetChange } from '../../src/remote/remote_event';
import { Dict } from '../../src/util/obj';
import { SortedMap } from '../../src/util/sorted_map';
import { SortedSet } from '../../src/util/sorted_set';
import { ByteString } from '../../src/util/byte_string';
import { DocumentReference } from '../../src/api/database';
import { Code } from '../../src/util/error';
import { BundledDocuments } from '../../src/core/bundle';
import * as bundleProto from '../../src/protos/firestore_bundle_proto';
export declare type TestSnapshotVersion = number;
export declare function testUserDataWriter(): UserDataWriter;
export declare function testUserDataReader(useProto3Json?: boolean): UserDataReader;
export declare function version(v: TestSnapshotVersion): SnapshotVersion;
export declare function ref(key: string, offset?: number): DocumentReference;
export declare function doc(keyStr: string, ver: TestSnapshotVersion, json: JsonObject<unknown>, options?: DocumentOptions): Document;
export declare function deletedDoc(keyStr: string, ver: TestSnapshotVersion, options?: DocumentOptions): NoDocument;
export declare function unknownDoc(keyStr: string, ver: TestSnapshotVersion): UnknownDocument;
export declare function removedDoc(keyStr: string): NoDocument;
export declare function wrap(value: unknown): api.Value;
export declare function wrapObject(obj: JsonObject<unknown>): ObjectValue;
export declare function dbId(project: string, database?: string): DatabaseId;
export declare function key(path: string): DocumentKey;
export declare function keys(...documents: Array<MaybeDocument | string>): DocumentKeySet;
export declare function path(path: string, offset?: number): ResourcePath;
export declare function field(path: string): FieldPath;
export declare function mask(...paths: string[]): FieldMask;
export declare function blob(...bytes: number[]): Blob;
export declare function filter(path: string, op: string, value: unknown): FieldFilter;
export declare function setMutation(keyStr: string, json: JsonObject<unknown>): SetMutation;
export declare function patchMutation(keyStr: string, json: JsonObject<unknown>, precondition?: Precondition): PatchMutation;
export declare function deleteMutation(keyStr: string): DeleteMutation;
/**
 * Creates a TransformMutation by parsing any FieldValue sentinels in the
 * provided data. The data is expected to use dotted-notation for nested fields
 * (i.e. { "foo.bar": FieldValue.foo() } and must not contain any non-sentinel
 * data.
 */
export declare function transformMutation(keyStr: string, data: Dict<unknown>): TransformMutation;
export declare function mutationResult(testVersion: TestSnapshotVersion): MutationResult;
export declare function bound(values: Array<[string, {}, firestore.OrderByDirection]>, before: boolean): Bound;
export declare function query(resourcePath: string, ...constraints: Array<OrderBy | Filter>): Query;
export declare function targetData(targetId: TargetId, queryPurpose: TargetPurpose, path: string): TargetData;
export declare function noChangeEvent(targetId: number, snapshotVersion: number, resumeToken?: ByteString): RemoteEvent;
export declare function docAddedRemoteEvent(docOrDocs: MaybeDocument | MaybeDocument[], updatedInTargets?: TargetId[], removedFromTargets?: TargetId[], activeTargets?: TargetId[]): RemoteEvent;
export declare function docUpdateRemoteEvent(doc: MaybeDocument, updatedInTargets?: TargetId[], removedFromTargets?: TargetId[], limboTargets?: TargetId[]): RemoteEvent;
export declare class TestBundledDocuments {
    documents: BundledDocuments;
    bundleName: string;
    constructor(documents: BundledDocuments, bundleName: string);
}
export declare function bundledDocuments(documents: MaybeDocument[], queryNames?: string[][], bundleName?: string): TestBundledDocuments;
export declare class TestNamedQuery {
    namedQuery: bundleProto.NamedQuery;
    matchingDocuments: DocumentKeySet;
    constructor(namedQuery: bundleProto.NamedQuery, matchingDocuments: DocumentKeySet);
}
export declare function namedQuery(name: string, query: Query, limitType: bundleProto.LimitType, readTime: SnapshotVersion, matchingDocuments?: DocumentKeySet): TestNamedQuery;
export declare function bundleMetadata(id: string, createTime: TestSnapshotVersion, version?: number, totalDocuments?: number, totalBytes?: number): bundleProto.BundleMetadata;
export declare function updateMapping(snapshotVersion: SnapshotVersion, added: Array<Document | string>, modified: Array<Document | string>, removed: Array<MaybeDocument | string>, current?: boolean): TargetChange;
export declare function addTargetMapping(...docsOrKeys: Array<Document | string>): TargetChange;
export declare function ackTarget(...docsOrKeys: Array<Document | string>): TargetChange;
export declare function limboChanges(changes: {
    added?: Document[];
    removed?: Document[];
}): LimboDocumentChange[];
export declare function localViewChanges(targetId: TargetId, fromCache: boolean, changes: {
    added?: string[];
    removed?: string[];
}): LocalViewChanges;
/**
 * Returns a ByteString representation for the platform from the given string.
 */
export declare function byteStringFromString(value: string): ByteString;
/**
 * Decodes a base 64 decoded string.
 *
 * Note that this is typed to accept Uint8Arrays to match the types used
 * by the spec tests. Since the spec tests only use JSON strings, this method
 * throws if an Uint8Array is passed.
 */
export declare function stringFromBase64String(value?: string | Uint8Array): string;
/** Creates a resume token to match the given snapshot version. */
export declare function resumeTokenForSnapshot(snapshotVersion: SnapshotVersion): ByteString;
export declare function orderBy(path: string, op?: string): OrderBy;
/**
 * Converts a sorted map to an array with inorder traversal
 */
export declare function mapAsArray<K, V>(sortedMap: SortedMap<K, V>): Array<{
    key: K;
    value: V;
}>;
/**
 * Converts a list of documents or document keys to a sorted map. A document
 * key is used to represent a deletion and maps to null.
 */
export declare function documentUpdates(...docsOrKeys: Array<Document | DocumentKey>): MaybeDocumentMap;
/**
 * Short for view.applyChanges(view.computeDocChanges(documentUpdates(docs))).
 */
export declare function applyDocChanges(view: View, ...docsOrKeys: Array<Document | DocumentKey>): ViewChange;
/**
 * Constructs a document set.
 */
export declare function documentSet(comp: DocumentComparator, ...docs: Document[]): DocumentSet;
export declare function documentSet(...docs: Document[]): DocumentSet;
/**
 * Constructs a document key set.
 */
export declare function keySet(...keys: DocumentKey[]): DocumentKeySet;
/** Converts a DocumentSet to an array. */
export declare function documentSetAsArray(docs: DocumentSet): Document[];
export declare class DocComparator {
    static byField(...fields: string[]): DocumentComparator;
}
/**
 * Two helper functions to simplify testing isEqual() method.
 */
export declare function expectEqual(left: any, right: any, message?: string): void;
export declare function expectNotEqual(left: any, right: any, message?: string): void;
export declare function expectEqualArrays(left: unknown[], right: unknown[], message?: string): void;
/**
 * Checks that an ordered array of elements yields the correct pair-wise
 * comparison result for the supplied comparator
 */
export declare function expectCorrectComparisons<T extends unknown>(array: T[], comp: (left: T, right: T) => number): void;
/**
 * Takes an array of "equality group" arrays and asserts that the comparator
 * returns the same as comparing the indexes of the "equality groups"
 * (0 for items in the same group).
 */
export declare function expectCorrectComparisonGroups<T extends unknown>(groups: T[][], comp: (left: T, right: T) => number): void;
/** Compares SortedSet to an array */
export declare function expectSetToEqual<T>(set: SortedSet<T>, arr: T[]): void;
/**
 * Takes an array of array of elements and compares each of the elements
 * to every other element.
 *
 * Elements in the same inner array are expect to be equal with regard to
 * the provided equality function to all other elements from the same array
 * (including itself) and unequal to all other elements from the other array
 */
export declare function expectEqualitySets<T>(elems: T[][], equalityFn: (v1: T, v2: T) => boolean, stringifyFn?: (v: T) => string): void;
export declare function validateFirestoreError(expectedCode: Code, actualError: Error): void;
export declare function forEachNumber<V>(obj: Dict<V>, fn: (key: number, val: V) => void): void;

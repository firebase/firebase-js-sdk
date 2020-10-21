/**
 * @license
 * Copyright 2020 Google LLC
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
import { FirebaseFirestore } from './database';
import { _DocumentKeyReference, UserDataReader } from '../../../src/api/user_data_reader';
import { Query as InternalQuery } from '../../../src/core/query';
import { ResourcePath } from '../../../src/model/path';
import { DocumentSnapshot, FirestoreDataConverter, QuerySnapshot } from './snapshot';
import { FieldPath } from './field_path';
/**
 * Document data (for use with {@link setDoc()}) consists of fields mapped to
 * values.
 */
export interface DocumentData {
    [field: string]: any;
}
/**
 * Update data (for use with {@link updateDoc()}) consists of field paths (e.g.
 * 'foo' or 'foo.baz') mapped to values. Fields that contain dots reference
 * nested fields within the document.
 */
export interface UpdateData {
    [fieldPath: string]: any;
}
/**
 * An options object that configures the behavior of {@link setDoc()}, {@link
 * WriteBatch#set()} and {@link Transaction#set()} calls. These calls can be
 * configured to perform granular merges instead of overwriting the target
 * documents in their entirety by providing a `SetOptions` with `merge: true`.
 *
 * @param merge Changes the behavior of a `setDoc()` call to only replace the
 * values specified in its data argument. Fields omitted from the `setDoc()`
 * call remain untouched.
 * @param mergeFields Changes the behavior of `setDoc()` calls to only replace
 * the specified field paths. Any field path that is not specified is ignored
 * and remains untouched.
 */
export declare type SetOptions = {
    readonly merge?: boolean;
} | {
    readonly mergeFields?: Array<string | FieldPath>;
};
/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist.
 */
export declare class DocumentReference<T = DocumentData> extends _DocumentKeyReference<T> {
    readonly _path: ResourcePath;
    /** The type of this Firestore reference. */
    readonly type = "document";
    /**
     * The {@link FirebaseFirestore} the document is in.
     * This is useful for performing transactions, for example.
     */
    readonly firestore: FirebaseFirestore;
    constructor(firestore: FirebaseFirestore, _converter: FirestoreDataConverter<T> | null, _path: ResourcePath);
    /**
     * The document's identifier within its collection.
     */
    get id(): string;
    /**
     * A string representing the path of the referenced document (relative
     * to the root of the database).
     */
    get path(): string;
    /**
     * The collection this `DocumentReference` belongs to.
     */
    get parent(): CollectionReference<T>;
    /**
     * Applies a custom data converter to this `DocumentReference`, allowing you
     * to use your own custom model objects with Firestore. When you call {@link
     * setDoc()}, {@link getDoc()}, etc. with the returned `DocumentReference`
     * instance, the provided converter will convert between Firestore data and
     * your custom type `U`.
     *
     * @param converter Converts objects to and from Firestore.
     * @return A `DocumentReference<U>` that uses the provided converter.
     */
    withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
}
/**
 * A `Query` refers to a Query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export declare class Query<T = DocumentData> {
    readonly _converter: FirestoreDataConverter<T> | null;
    readonly _query: InternalQuery;
    /** The type of this Firestore reference. */
    readonly type: 'query' | 'collection';
    /**
     * The `FirebaseFirestore` for the Firestore database (useful for performing
     * transactions, etc.).
     */
    readonly firestore: FirebaseFirestore;
    constructor(firestore: FirebaseFirestore, _converter: FirestoreDataConverter<T> | null, _query: InternalQuery);
    /**
     * Applies a custom data converter to this query, allowing you to use your own
     * custom model objects with Firestore. When you call {@link getDocs()} with
     * the returned query, the provided converter will convert between Firestore
     * data and your custom type `U`.
     *
     * @param converter Converts objects to and from Firestore.
     * @return A `Query<U>` that uses the provided converter.
     */
    withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
}
/** Describes the different query constraints available in this SDK. */
export declare type QueryConstraintType = 'where' | 'orderBy' | 'limit' | 'limitToLast' | 'startAt' | 'startAfter' | 'endAt' | 'endBefore';
/**
 * A `QueryConstraint` is used to narrow the set of documents returned by a
 * Firestore query. `QueryConstraint`s are created by invoking {@link where()},
 * {@link orderBy()}, {@link startAt()}, {@link startAfter()}, {@link
 * endBefore()}, {@link endAt()}, {@link limit()} or {@link limitToLast()} and
 * can then be passed to {@link query()} to create a new query instance that
 * also contains this `QueryConstraint`.
 */
export declare abstract class QueryConstraint {
    /** The type of this query constraints */
    abstract readonly type: QueryConstraintType;
    /**
     * Takes the provided `Query` and returns a copy of the `Query` with this
     * `QueryConstraint` applied.
     */
    abstract _apply<T>(query: Query<T>): Query<T>;
}
/**
 * Creates a new immutable instance of `query` that is extended to also include
 * additional query constraints.
 *
 * @param query The query instance to use as a base for the new constraints.
 * @param queryConstraints The list of `QueryConstraint`s to apply.
 * @throws if any of the provided query constraints cannot be combined with the
 * existing or new constraints.
 */
export declare function query<T>(query: Query<T>, ...queryConstraints: QueryConstraint[]): Query<T>;
/**
 * Filter conditions in a {@link where()} clause are specified using the
 * strings '<', '<=', '==', '!=', '>=', '>', 'array-contains', 'in',
 * 'array-contains-any', and 'not-in'.
 */
export declare type WhereFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
/**
 * Creates a `QueryConstraint` that enforces that documents must contain the
 * specified field and that the value should satisfy the relation constraint
 * provided.
 *
 * @param fieldPath The path to compare
 * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=", "!=").
 * @param value The value for comparison
 * @return The created `Query`.
 */
export declare function where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: unknown): QueryConstraint;
/**
 * The direction of a {@link orderBy()} clause is specified as 'desc' or 'asc'
 * (descending or ascending).
 */
export declare type OrderByDirection = 'desc' | 'asc';
/**
 * Creates a `QueryConstraint` that sorts the query result by the
 * specified field, optionally in descending order instead of ascending.
 *
 * @param fieldPath The field to sort by.
 * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
 * not specified, order will be ascending.
 * @return The created `Query`.
 */
export declare function orderBy(fieldPath: string | FieldPath, directionStr?: OrderByDirection): QueryConstraint;
/**
 * Creates a `QueryConstraint` that only returns the first matching documents.
 *
 * @param limit The maximum number of items to return.
 * @return The created `Query`.
 */
export declare function limit(limit: number): QueryConstraint;
/**
 * Creates a `QueryConstraint` that only returns the last matching documents.
 *
 * You must specify at least one `orderBy` clause for `limitToLast` queries,
 * otherwise an exception will be thrown during execution.
 *
 * @param limit The maximum number of items to return.
 * @return The created `Query`.
 */
export declare function limitToLast(limit: number): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided document (inclusive). The starting position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * `orderBy` of this query.
 *
 * @param snapshot The snapshot of the document to start at.
 * @return A `QueryConstraint` to pass to `query()`.
 */
export declare function startAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query at, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`.
 */
export declare function startAt(...fieldValues: unknown[]): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided document (exclusive). The starting position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to start after.
 * @return A `QueryConstraint` to pass to `query()`
 */
export declare function startAfter(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query after, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export declare function startAfter(...fieldValues: unknown[]): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided document (exclusive). The end position is relative to the order of
 * the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to end before.
 * @return A `QueryConstraint` to pass to `query()`
 */
export declare function endBefore(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query before, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export declare function endBefore(...fieldValues: unknown[]): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided document (inclusive). The end position is relative to the order of
 * the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to end at.
 * @return A `QueryConstraint` to pass to `query()`
 */
export declare function endAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query at, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export declare function endAt(...fieldValues: unknown[]): QueryConstraint;
/**
 * A `CollectionReference` object can be used for adding documents, getting
 * document references, and querying for documents (using {@link query()}`).
 */
export declare class CollectionReference<T = DocumentData> extends Query<T> {
    readonly firestore: FirebaseFirestore;
    readonly _path: ResourcePath;
    readonly type = "collection";
    constructor(firestore: FirebaseFirestore, converter: FirestoreDataConverter<T> | null, _path: ResourcePath);
    /** The collection's identifier. */
    get id(): string;
    /**
     * A string representing the path of the referenced collection (relative
     * to the root of the database).
     */
    get path(): string;
    /**
     * A reference to the containing `DocumentReference` if this is a
     * subcollection. If this isn't a subcollection, the reference is null.
     */
    get parent(): DocumentReference<DocumentData> | null;
    /**
     * Applies a custom data converter to this CollectionReference, allowing you
     * to use your own custom model objects with Firestore. When you call {@link
     * addDoc()} with the returned `CollectionReference` instance, the provided
     * converter will convert between Firestore data and your custom type `U`.
     *
     * @param converter Converts objects to and from Firestore.
     * @return A `CollectionReference<U>` that uses the provided converter.
     */
    withConverter<U>(converter: FirestoreDataConverter<U>): CollectionReference<U>;
}
/**
 * Gets a `CollectionReference` instance that refers to the collection at
 * the specified absolute path.
 *
 * @param firestore A reference to the root Firestore instance.
 * @param path A slash-separated path to a collection.
 * @param pathSegments Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @return The `CollectionReference` instance.
 */
export declare function collection(firestore: FirebaseFirestore, path: string, ...pathSegments: string[]): CollectionReference<DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference A reference to a collection.
 * @param path A slash-separated path to a collection.
 * @param pathSegments Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @return The `CollectionReference` instance.
 */
export declare function collection(reference: CollectionReference<unknown>, path: string, ...pathSegments: string[]): CollectionReference<DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference A reference to a Firestore document.
 * @param path A slash-separated path to a collection.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @return The `CollectionReference` instance.
 */
export declare function collection(reference: DocumentReference, path: string, ...pathSegments: string[]): CollectionReference<DocumentData>;
/**
 * Creates and returns a new `Query` instance that includes all documents in the
 * database that are contained in a collection or subcollection with the
 * given `collectionId`.
 *
 * @param firestore A reference to the root Firestore instance.
 * @param collectionId Identifies the collections to query over. Every
 * collection or subcollection with this ID as the last segment of its path
 * will be included. Cannot contain a slash.
 * @return The created `Query`.
 */
export declare function collectionGroup(firestore: FirebaseFirestore, collectionId: string): Query<DocumentData>;
/**
 * Gets a `DocumentReference` instance that refers to the document at the
 * specified abosulute path.
 *
 * @param firestore A reference to the root Firestore instance.
 * @param path A slash-separated path to a document.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @return The `DocumentReference` instance.
 */
export declare function doc(firestore: FirebaseFirestore, path: string, ...pathSegments: string[]): DocumentReference<DocumentData>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path. If no path is specified, an
 * automatically-generated unique ID will be used for the returned
 * `DocumentReference`.
 *
 * @param reference A reference to a collection.
 * @param path A slash-separated path to a document. Has to be omitted to use
 * auto-genrated IDs.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @return The `DocumentReference` instance.
 */
export declare function doc<T>(reference: CollectionReference<T>, path?: string, ...pathSegments: string[]): DocumentReference<T>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path.
 *
 * @param reference A reference to a Firestore document.
 * @param path A slash-separated path to a document.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @return The `DocumentReference` instance.
 */
export declare function doc(reference: DocumentReference<unknown>, path: string, ...pathSegments: string[]): DocumentReference<DocumentData>;
/**
 * Reads the document referred to by the specified document reference.
 *
 * All documents are directly fetched from the server, even if the document was
 * previously read or modified. Recent modifications are only reflected in the
 * retrieved `DocumentSnapshot` if they have already been applied by the
 * backend. If the client is offline, the read fails. If you like to use
 * caching or see local modifications, please use the full Firestore SDK.
 *
 * @param reference The reference of the document to fetch.
 * @return A Promise resolved with a `DocumentSnapshot` containing the current
 * document contents.
 */
export declare function getDoc<T>(reference: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
/**
 * Executes the query and returns the results as a {@link QuerySnapshot}.
 *
 * All queries are executed directly by the server, even if the the query was
 * previously executed. Recent modifications are only reflected in the retrieved
 * results if they have already been applied by the backend. If the client is
 * offline, the operation fails. To see previously cached result and local
 * modifications, use the full Firestore SDK.
 *
 * @param query The `Query` to execute.
 * @return A Promise that will be resolved with the results of the query.
 */
export declare function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>>;
/**
 * Writes to the document referred to by the specified `DocumentReference`. If
 * the document does not yet exist, it will be created.
 *
 * The result of this write will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to write.
 * @param data A map of the fields and values for the document.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
export declare function setDoc<T>(reference: DocumentReference<T>, data: T): Promise<void>;
/**
 * Writes to the document referred to by the specified `DocumentReference`. If
 * the document does not yet exist, it will be created. If you provide `merge`
 * or `mergeFields`, the provided data can be merged into an existing document.
 *
 * The result of this write will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to write.
 * @param data A map of the fields and values for the document.
 * @param options An object to configure the set behavior.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
export declare function setDoc<T>(reference: DocumentReference<T>, data: Partial<T>, options: SetOptions): Promise<void>;
/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference`. The update will fail if applied to a document that does
 * not exist.
 *
 * The result of this update will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * update fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to update.
 * @param data An object containing the fields and values with which to
 * update the document. Fields can contain dots to reference nested fields
 * within the document.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
export declare function updateDoc(reference: DocumentReference<unknown>, data: UpdateData): Promise<void>;
/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference` The update will fail if applied to a document that does
 * not exist.
 *
 * Nested fields can be updated by providing dot-separated field path
 * strings or by providing `FieldPath` objects.
 *
 * The result of this update will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * update fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to update.
 * @param field The first field to update.
 * @param value The first value.
 * @param moreFieldsAndValues Additional key value pairs.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
export declare function updateDoc(reference: DocumentReference<unknown>, field: string | FieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): Promise<void>;
/**
 * Deletes the document referred to by the specified `DocumentReference`.
 *
 * The deletion will only be reflected in document reads that occur after the
 * returned Promise resolves. If the client is offline, the
 * delete fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to delete.
 * @return A Promise resolved once the document has been successfully
 * deleted from the backend.
 */
export declare function deleteDoc(reference: DocumentReference): Promise<void>;
/**
 * Add a new document to specified `CollectionReference` with the given data,
 * assigning it a document ID automatically.
 *
 * The result of this write will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the collection to add this document to.
 * @param data An Object containing the data for the new document.
 * @return A Promise resolved with a `DocumentReference` pointing to the
 * newly created document after it has been written to the backend.
 */
export declare function addDoc<T>(reference: CollectionReference<T>, data: T): Promise<DocumentReference<T>>;
/**
 * Returns true if the provided references are equal.
 *
 * @param left A reference to compare.
 * @param right A reference to compare.
 * @return true if the references point to the same location in the same
 * Firestore database.
 */
export declare function refEqual<T>(left: DocumentReference<T> | CollectionReference<T>, right: DocumentReference<T> | CollectionReference<T>): boolean;
/**
 * Returns true if the provided queries point to the same collection and apply
 * the same constraints.
 *
 * @param left A `Query` to compare.
 * @param right A Query` to compare.
 * @return true if the references point to the same location in the same
 * Firestore database.
 */
export declare function queryEqual<T>(left: Query<T>, right: Query<T>): boolean;
export declare function newUserDataReader(firestore: FirebaseFirestore): UserDataReader;

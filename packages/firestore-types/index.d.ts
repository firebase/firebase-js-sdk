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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';

/**
 * Document data (for use with `DocumentReference.set()`) consists of fields
 * mapped to values.
 */
export type DocumentData = { [field: string]: any };

/**
 * Update data (for use with `DocumentReference.update()`) consists of field
 * paths (e.g. 'foo' or 'foo.baz') mapped to values. Fields that contain dots
 * reference nested fields within the document.
 */
export type UpdateData = { [fieldPath: string]: any };

/** Settings used to configure a `Firestore` instance. */
export interface Settings {
  /** The hostname to connect to. */
  host?: string;
  /** Whether to use SSL when connecting. */
  ssl?: boolean;
}

export type LogLevel = 'debug' | 'error' | 'silent';

export function setLogLevel(logLevel: LogLevel): void;

/**
 * `Firestore` represents a Firestore Database and is the entry point for all
 * Firestore operations.
 */
export class FirebaseFirestore {
  private constructor();
  /**
   * Specifies custom settings to be used to configure the `Firestore`
   * instance. Must be set before invoking any other methods.
   *
   * @param settings The settings to use.
   */
  settings(settings: Settings): void;

  /**
   * Attempts to enable persistent storage, if possible.
   *
   * Must be called before any other methods (other than settings()).
   *
   * If this fails, enablePersistence() will reject the promise it returns.
   * Note that even after this failure, the firestore instance will remain
   * usable, however offline persistence will be disabled.
   *
   * There are several reasons why this can fail, which can be identified by
   * the `code` on the error.
   *
   *   * failed-precondition: The app is already open in another browser tab.
   *   * unimplemented: The browser is incompatible with the offline
   *     persistence implementation.
   *
   * @return A promise that represents successfully enabling persistent
   * storage.
   */
  enablePersistence(): Promise<void>;

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @return The `CollectionReference` instance.
   */
  collection(collectionPath: string): CollectionReference;

  /**
   * Gets a `DocumentReference` instance that refers to the document at the
   * specified path.
   *
   * @param documentPath A slash-separated path to a document.
   * @return The `DocumentReference` instance.
   */
  doc(documentPath: string): DocumentReference;

  /**
   * Executes the given updateFunction and then attempts to commit the
   * changes applied within the transaction. If any document read within the
   * transaction has changed, the updateFunction will be retried. If it fails
   * to commit after 5 attempts, the transaction will fail.
   *
   * @param updateFunction The function to execute within the transaction
   * context.
   * @return If the transaction completed successfully or was explicitly
   * aborted (by the updateFunction returning a failed Promise), the Promise
   * returned by the updateFunction will be returned here. Else if the
   * transaction failed, a rejected Promise with the corresponding failure
   * error will be returned.
   */
  runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T>;

  /**
   * Creates a write batch, used for performing multiple writes as a single
   * atomic operation.
   */
  batch(): WriteBatch;

  /**
   * The `FirebaseApp` associated with this `Firestore` instance.
   */
  app: any;

  /**
   * Re-enables use of the network for this Firestore instance after a prior
   * call to disableNetwork().
   *
   * @return A promise that is resolved once the network has been enabled.
   */
  enableNetwork(): Promise<void>;

  /**
   * Disables network usage for this instance. It can be re-enabled via
   * enableNetwork(). While the network is disabled, any snapshot listeners or
   * get() calls will return results from cache, and any write operations will
   * be queued until the network is restored.
   *
   * @return A promise that is resolved once the network has been disabled.
   */
  disableNetwork(): Promise<void>;

  INTERNAL: { delete: () => Promise<void> };
}

/**
 * An immutable object representing a geo point in Firestore. The geo point
 * is represented as latitude/longitude pair.
 *
 * Latitude values are in the range of [-90, 90].
 * Longitude values are in the range of [-180, 180].
 */
export class GeoPoint {
  /**
   * Creates a new immutable GeoPoint object with the provided latitude and
   * longitude values.
   * @param latitude The latitude as number between -90 and 90.
   * @param longitude The longitude as number between -180 and 180.
   */
  constructor(latitude: number, longitude: number);

  readonly latitude: number;
  readonly longitude: number;

  /**
   * Returns true if this `GeoPoint` is equal to the provided one.
   *
   * @param other The `GeoPoint` to compare against.
   * @return true if this `GeoPoint` is equal to the provided one.
   */
  isEqual(other: GeoPoint): boolean;
}

/**
 * An immutable object representing an array of bytes.
 */
export class Blob {
  private constructor();

  /**
   * Creates a new Blob from the given Base64 string, converting it to
   * bytes.
   */
  static fromBase64String(base64: string): Blob;

  /**
   * Creates a new Blob from the given Uint8Array.
   */
  static fromUint8Array(array: Uint8Array): Blob;

  /**
   * Returns the bytes of this Blob as a Base64-encoded string.
   */
  public toBase64(): string;

  /**
   * Returns the bytes of this Blob in a new Uint8Array.
   */
  public toUint8Array(): Uint8Array;

  /**
   * Returns true if this `Blob` is equal to the provided one.
   *
   * @param other The `Blob` to compare against.
   * @return true if this `Blob` is equal to the provided one.
   */
  isEqual(other: Blob): boolean;
}

/**
 * A reference to a transaction.
 * The `Transaction` object passed to a transaction's updateFunction provides
 * the methods to read and write data within the transaction context. See
 * `Firestore.runTransaction()`.
 */
export class Transaction {
  private constructor();

  /**
   * Reads the document referenced by the provided `DocumentReference.`
   *
   * @param documentRef A reference to the document to be read.
   * @return A DocumentSnapshot for the read data.
   */
  get(documentRef: DocumentReference): Promise<DocumentSnapshot>;

  /**
   * Writes to the document referred to by the provided `DocumentReference`.
   * If the document does not exist yet, it will be created. If you pass
   * `SetOptions`, the provided data can be merged into the existing document.
   *
   * @param documentRef A reference to the document to be set.
   * @param data An object of the fields and values for the document.
   * @param options An object to configure the set behavior.
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  set(
    documentRef: DocumentReference,
    data: DocumentData,
    options?: SetOptions
  ): Transaction;

  /**
   * Updates fields in the document referred to by the provided
   * `DocumentReference`. The update will fail if applied to a document that
   * does not exist.
   *
   * @param documentRef A reference to the document to be updated.
   * @param data An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  update(documentRef: DocumentReference, data: UpdateData): Transaction;

  /**
   * Updates fields in the document referred to by the provided
   * `DocumentReference`. The update will fail if applied to a document that
   * does not exist.
   *
   * Nested fields can be updated by providing dot-separated field path
   * strings or by providing FieldPath objects.
   *
   * @param documentRef A reference to the document to be updated.
   * @param field The first field to update.
   * @param value The first value.
   * @param moreFieldsAndValues Additional key/value pairs.
   * @return A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
  update(
    documentRef: DocumentReference,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Transaction;

  /**
   * Deletes the document referred to by the provided `DocumentReference`.
   *
   * @param documentRef A reference to the document to be deleted.
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  delete(documentRef: DocumentReference): Transaction;
}

/**
 * A write batch, used to perform multiple writes as a single atomic unit.
 *
 * A `WriteBatch` object can be acquired by calling `Firestore.batch()`. It
 * provides methods for adding writes to the write batch. None of the
 * writes will be committed (or visible locally) until `WriteBatch.commit()`
 * is called.
 *
 * Unlike transactions, write batches are persisted offline and therefore are
 * preferable when you don't need to condition your writes on read data.
 */
export class WriteBatch {
  private constructor();

  /**
   * Writes to the document referred to by the provided `DocumentReference`.
   * If the document does not exist yet, it will be created. If you pass
   * `SetOptions`, the provided data can be merged into the existing document.
   *
   * @param documentRef A reference to the document to be set.
   * @param data An object of the fields and values for the document.
   * @param options An object to configure the set behavior.
   * @return This `WriteBatch` instance. Used for chaining method calls.
   */
  set(
    documentRef: DocumentReference,
    data: DocumentData,
    options?: SetOptions
  ): WriteBatch;

  /**
   * Updates fields in the document referred to by the provided
   * `DocumentReference`. The update will fail if applied to a document that
   * does not exist.
   *
   * @param documentRef A reference to the document to be updated.
   * @param data An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @return This `WriteBatch` instance. Used for chaining method calls.
   */
  update(documentRef: DocumentReference, data: UpdateData): WriteBatch;

  /**
   * Updates fields in the document referred to by this `DocumentReference`.
   * The update will fail if applied to a document that does not exist.
   *
   * Nested fields can be update by providing dot-separated field path strings
   * or by providing FieldPath objects.
   *
   * @param documentRef A reference to the document to be updated.
   * @param field The first field to update.
   * @param value The first value.
   * @param moreFieldsAndValues Additional key value pairs.
   * @return A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
  update(
    documentRef: DocumentReference,
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): WriteBatch;

  /**
   * Deletes the document referred to by the provided `DocumentReference`.
   *
   * @param documentRef A reference to the document to be deleted.
   * @return This `WriteBatch` instance. Used for chaining method calls.
   */
  delete(documentRef: DocumentReference): WriteBatch;

  /**
   * Commits all of the writes in this write batch as a single atomic unit.
   *
   * @return A Promise resolved once all of the writes in the batch have been
   * successfully written to the backend as an atomic unit. Note that it won't
   * resolve while you're offline.
   */
  commit(): Promise<void>;
}

/**
 * Options for use with `DocumentReference.onSnapshot()` to control the
 * behavior of the snapshot listener.
 */
export interface DocumentListenOptions {
  /**
   * Raise an event even if only metadata of the document changed. Default is
   * false.
   */
  readonly includeMetadataChanges?: boolean;
}

/**
 * An options object that configures the behavior of `set()` calls in
 * `DocumentReference`, `WriteBatch` and `Transaction`. These calls can be
 * configured to perform granular merges instead of overwriting the target
 * documents in their entirety by providing a `SetOptions` with `merge: true`.
 */
export interface SetOptions {
  /**
   * Changes the behavior of a set() call to only replace the values specified
   * in its data argument. Fields omitted from the set() call remain
   * untouched.
   */
  readonly merge?: boolean;
}

/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist. A `DocumentReference` can
 * also be used to create a `CollectionReference` to a subcollection.
 */
export class DocumentReference {
  private constructor();

  /** The identifier of the document within its collection. */
  readonly id: string;

  /**
   * The `Firestore` for the Firestore database (useful for performing
   * transactions, etc.).
   */
  readonly firestore: FirebaseFirestore;

  /**
   * A reference to the Collection to which this DocumentReference belongs.
   */
  readonly parent: CollectionReference;

  /**
   * A string representing the path of the referenced document (relative
   * to the root of the database).
   */
  readonly path: string;

  /**
   * Gets a `CollectionReference` instance that refers to the collection at
   * the specified path.
   *
   * @param collectionPath A slash-separated path to a collection.
   * @return The `CollectionReference` instance.
   */
  collection(collectionPath: string): CollectionReference;

  /**
   * Returns true if this `DocumentReference` is equal to the provided one.
   *
   * @param other The `DocumentReference` to compare against.
   * @return true if this `DocumentReference` is equal to the provided one.
   */
  isEqual(other: DocumentReference): boolean;

  /**
   * Writes to the document referred to by this `DocumentReference`. If the
   * document does not yet exist, it will be created. If you pass
   * `SetOptions`, the provided data can be merged into an existing document.
   *
   * @param data A map of the fields and values for the document.
   * @param options An object to configure the set behavior.
   * @return A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
  set(data: DocumentData, options?: SetOptions): Promise<void>;

  /**
   * Updates fields in the document referred to by this `DocumentReference`.
   * The update will fail if applied to a document that does not exist.
   *
   * @param data An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @return A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
  update(data: UpdateData): Promise<void>;

  /**
   * Updates fields in the document referred to by this `DocumentReference`.
   * The update will fail if applied to a document that does not exist.
   *
   * Nested fields can be updated by providing dot-separated field path
   * strings or by providing FieldPath objects.
   *
   * @param field The first field to update.
   * @param value The first value.
   * @param moreFieldsAndValues Additional key value pairs.
   * @return A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
  update(
    field: string | FieldPath,
    value: any,
    ...moreFieldsAndValues: any[]
  ): Promise<void>;

  /**
   * Deletes the document referred to by this `DocumentReference`.
   *
   * @return A Promise resolved once the document has been successfully
   * deleted from the backend (Note that it won't resolve while you're
   * offline).
   */
  delete(): Promise<void>;

  /**
   * Reads the document referred to by this `DocumentReference`.
   *
   * Note: get() attempts to provide up-to-date data when possible by waiting
   * for data from the server, but it may return cached data or fail if you
   * are offline and the server cannot be reached.
   *
   * @return A Promise resolved with a DocumentSnapshot containing the
   * current document contents.
   */
  get(): Promise<DocumentSnapshot>;

  /**
   * Attaches a listener for DocumentSnapshot events. You may either pass
   * individual `onNext` and `onError` callbacks or pass a single observer
   * object with `next` and `error` callbacks.
   *
   * NOTE: Although an `onCompletion` callback can be provided, it will
   * never be called because the snapshot stream is never-ending.
   *
   * @param options Options controlling the listen behavior.
   * @param onNext A callback to be called every time a new `DocumentSnapshot`
   * is available.
   * @param onError A callback to be called if the listen fails or is
   * cancelled. No further callbacks will occur.
   * @param observer A single object containing `next` and `error` callbacks.
   * @return An unsubscribe function that can be called to cancel
   * the snapshot listener.
   */
  onSnapshot(observer: {
    next?: (snapshot: DocumentSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: DocumentListenOptions,
    observer: {
      next?: (snapshot: DocumentSnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: DocumentListenOptions,
    onNext: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
}

/**
 * Options that configure how data is retrieved from a `DocumentSnapshot`
 * (e.g. the desired behavior for server timestamps that have not yet been set
 * to their final value).
 */
export interface SnapshotOptions {
  /**
   * If set, controls the return value for server timestamps that have not yet
   * been set to their final value.
   *
   * By specifying 'estimate', pending server timestamps return an estimate
   * based on the local clock. This estimate will differ from the final value
   * and cause these values to change once the server result becomes available.
   *
   * By specifying 'previous', pending timestamps will be ignored and return
   * their previous value instead.
   *
   * If omitted or set to 'none', `null` will be returned by default until the
   * server value becomes available.
   */
  readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
}

/** Metadata about a snapshot, describing the state of the snapshot. */
export interface SnapshotMetadata {
  /**
   * True if the snapshot contains the result of local writes (e.g. set() or
   * update() calls) that have not yet been committed to the backend.
   * If your listener has opted into metadata updates (via
   * `DocumentListenOptions` or `QueryListenOptions`) you will receive another
   * snapshot with `hasPendingWrites` equal to false once the writes have been
   * committed to the backend.
   */
  readonly hasPendingWrites: boolean;

  /**
   * True if the snapshot was created from cached data rather than
   * guaranteed up-to-date server data. If your listener has opted into
   * metadata updates (via `DocumentListenOptions` or `QueryListenOptions`)
   * you will receive another snapshot with `fromCache` equal to false once
   * the client has received up-to-date data from the backend.
   */
  readonly fromCache: boolean;

  /**
   * Returns true if this `SnapshotMetadata` is equal to the provided one.
   *
   * @param other The `SnapshotMetadata` to compare against.
   * @return true if this `SnapshotMetadata` is equal to the provided one.
   */
  isEqual(other: SnapshotMetadata): boolean;
}

/**
 * A `DocumentSnapshot` contains data read from a document in your Firestore
 * database. The data can be extracted with `.data()` or `.get(<field>)` to
 * get a specific field.
 *
 * For a `DocumentSnapshot` that points to a non-existing document, any data
 * access will return 'undefined'. You can use the `exists` property to
 * explicitly verify a document's existence.
 */
export class DocumentSnapshot {
  protected constructor();

  /** True if the document exists. */
  readonly exists: boolean;
  /** A `DocumentReference` to the document location. */
  readonly ref: DocumentReference;
  /**
   * The ID of the document for which this `DocumentSnapshot` contains data.
   */
  readonly id: string;
  /**
   * Metadata about this snapshot, concerning its source and if it has local
   * modifications.
   */
  readonly metadata: SnapshotMetadata;

  /**
   * Retrieves all fields in the document as an Object. Returns 'undefined' if
   * the document doesn't exist.
   *
   * By default, `FieldValue.serverTimestamp()` values that have not yet been
   * set to their final value will be returned as `null`. You can override
   * this by passing an options object.
   *
   * @param options An options object to configure how data is retrieved from
   * the snapshot (e.g. the desired behavior for server timestamps that have
   * not yet been set to their final value).
   * @return An Object containing all fields in the document or 'undefined' if
   * the document doesn't exist.
   */
  data(options?: SnapshotOptions): DocumentData | undefined;

  /**
   * Retrieves the field specified by `fieldPath`. Returns 'undefined' if the
   * document or field doesn't exist.
   *
   * By default, a `FieldValue.serverTimestamp()` that has not yet been set to
   * its final value will be returned as `null`. You can override this by
   * passing an options object.
   *
   * @param fieldPath The path (e.g. 'foo' or 'foo.bar') to a specific field.
   * @param options An options object to configure how the field is retrieved
   * from the snapshot (e.g. the desired behavior for server timestamps that have
   * not yet been set to their final value).
   * @return The data at the specified field location or undefined if no such
   * field exists in the document.
   */
  get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;

  /**
   * Returns true if this `DocumentSnapshot` is equal to the provided one.
   *
   * @param other The `DocumentSnapshot` to compare against.
   * @return true if this `DocumentSnapshot` is equal to the provided one.
   */
  isEqual(other: DocumentSnapshot): boolean;
}

/**
 * A `QueryDocumentSnapshot` contains data read from a document in your
 * Firestore database as part of a query. The document is guaranteed to exist
 * and its data can be extracted with `.data()` or `.get(<field>)` to get a
 * specific field.
 *
 * A `QueryDocumentSnapshot` offers the same API surface as a
 * `DocumentSnapshot`. Since query results contain only existing documents, the
 * `exists` property will always be true and `data()` will never return
 * 'undefined'.
 */
export class QueryDocumentSnapshot extends DocumentSnapshot {
  private constructor();

  /**
   * Retrieves all fields in the document as an Object.
   *
   * By default, `FieldValue.serverTimestamp()` values that have not yet been
   * set to their final value will be returned as `null`. You can override
   * this by passing an options object.
   *
   * @override
   * @param options An options object to configure how data is retrieved from
   * the snapshot (e.g. the desired behavior for server timestamps that have
   * not yet been set to their final value).
   * @return An Object containing all fields in the document.
   */
  data(options?: SnapshotOptions): DocumentData;
}

/**
 * The direction of a `Query.orderBy()` clause is specified as 'desc' or 'asc'
 * (descending or ascending).
 */
export type OrderByDirection = 'desc' | 'asc';

/**
 * Filter conditions in a `Query.where()` clause are specified using the
 * strings '<', '<=', '==', '>=', and '>'.
 */
export type WhereFilterOp = '<' | '<=' | '==' | '>=' | '>';

/**
 * Options for use with `Query.onSnapshot() to control the behavior of the
 * snapshot listener.
 */
export interface QueryListenOptions {
  /**
   * Raise an event even if only metadata changes (i.e. one of the
   * `QuerySnapshot.metadata` properties). Default is false.
   */
  readonly includeQueryMetadataChanges?: boolean;

  /**
   * Raise an event even if only metadata of a document in the query results
   * changes (i.e. one of the `DocumentSnapshot.metadata` properties on one of
   * the documents). Default is false.
   */
  readonly includeDocumentMetadataChanges?: boolean;
}

/**
 * A `Query` refers to a Query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export class Query {
  protected constructor();

  /**
   * The `Firestore` for the Firestore database (useful for performing
   * transactions, etc.).
   */
  readonly firestore: FirebaseFirestore;

  /**
   * Creates and returns a new Query with the additional filter that documents
   * must contain the specified field and the value should satisfy the
   * relation constraint provided.
   *
   * @param fieldPath The path to compare
   * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
   * @param value The value for comparison
   * @return The created Query.
   */
  where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: any): Query;

  /**
   * Creates and returns a new Query that's additionally sorted by the
   * specified field, optionally in descending order instead of ascending.
   *
   * @param fieldPath The field to sort by.
   * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
   * not specified, order will be ascending.
   * @return The created Query.
   */
  orderBy(
    fieldPath: string | FieldPath,
    directionStr?: OrderByDirection
  ): Query;

  /**
   * Creates and returns a new Query that's additionally limited to only
   * return up to the specified number of documents.
   *
   * @param limit The maximum number of items to return.
   * @return The created Query.
   */
  limit(limit: number): Query;

  /**
   * Creates and returns a new Query that starts at the provided document
   * (inclusive). The starting position is relative to the order of the query.
   * The document must contain all of the fields provided in the orderBy of
   * this query.
   *
   * @param snapshot The snapshot of the document to start at.
   * @return The created Query.
   */
  startAt(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that starts at the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to start this query at, in order
   * of the query's order by.
   * @return The created Query.
   */
  startAt(...fieldValues: any[]): Query;

  /**
   * Creates and returns a new Query that starts after the provided document
   * (exclusive). The starting position is relative to the order of the query.
   * The document must contain all of the fields provided in the orderBy of
   * this query.
   *
   * @param snapshot The snapshot of the document to start after.
   * @return The created Query.
   */
  startAfter(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that starts after the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to start this query after, in order
   * of the query's order by.
   * @return The created Query.
   */
  startAfter(...fieldValues: any[]): Query;

  /**
   * Creates and returns a new Query that ends before the provided document
   * (exclusive). The end position is relative to the order of the query. The
   * document must contain all of the fields provided in the orderBy of this
   * query.
   *
   * @param snapshot The snapshot of the document to end before.
   * @return The created Query.
   */
  endBefore(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that ends before the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to end this query before, in order
   * of the query's order by.
   * @return The created Query.
   */
  endBefore(...fieldValues: any[]): Query;

  /**
   * Creates and returns a new Query that ends at the provided document
   * (inclusive). The end position is relative to the order of the query. The
   * document must contain all of the fields provided in the orderBy of this
   * query.
   *
   * @param snapshot The snapshot of the document to end at.
   * @return The created Query.
   */
  endAt(snapshot: DocumentSnapshot): Query;

  /**
   * Creates and returns a new Query that ends at the provided fields
   * relative to the order of the query. The order of the field values
   * must match the order of the order by clauses of the query.
   *
   * @param fieldValues The field values to end this query at, in order
   * of the query's order by.
   * @return The created Query.
   */
  endAt(...fieldValues: any[]): Query;

  /**
   * Returns true if this `Query` is equal to the provided one.
   *
   * @param other The `Query` to compare against.
   * @return true if this `Query` is equal to the provided one.
   */
  isEqual(other: Query): boolean;

  /**
   * Executes the query and returns the results as a QuerySnapshot.
   *
   * @return A Promise that will be resolved with the results of the Query.
   */
  get(): Promise<QuerySnapshot>;

  /**
   * Attaches a listener for QuerySnapshot events. You may either pass
   * individual `onNext` and `onError` callbacks or pass a single observer
   * object with `next` and `error` callbacks.
   *
   * NOTE: Although an `onCompletion` callback can be provided, it will
   * never be called because the snapshot stream is never-ending.
   *
   * @param options Options controlling the listen behavior.
   * @param onNext A callback to be called every time a new `QuerySnapshot`
   * is available.
   * @param onError A callback to be called if the listen fails or is
   * cancelled. No further callbacks will occur.
   * @param observer A single object containing `next` and `error` callbacks.
   * @return An unsubscribe function that can be called to cancel
   * the snapshot listener.
   */
  onSnapshot(observer: {
    next?: (snapshot: QuerySnapshot) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }): () => void;
  onSnapshot(
    options: QueryListenOptions,
    observer: {
      next?: (snapshot: QuerySnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): () => void;
  onSnapshot(
    onNext: (snapshot: QuerySnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
  onSnapshot(
    options: QueryListenOptions,
    onNext: (snapshot: QuerySnapshot) => void,
    onError?: (error: Error) => void,
    onCompletion?: () => void
  ): () => void;
}

/**
 * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
 * representing the results of a query. The documents can be accessed as an
 * array via the `docs` property or enumerated using the `forEach` method. The
 * number of documents can be determined via the `empty` and `size`
 * properties.
 */
export class QuerySnapshot {
  private constructor();

  /**
   * The query on which you called `get` or `onSnapshot` in order to get this
   * `QuerySnapshot`.
   */
  readonly query: Query;
  /**
   * Metadata about this snapshot, concerning its source and if it has local
   * modifications.
   */
  readonly metadata: SnapshotMetadata;
  /**
   * An array of the documents that changed since the last snapshot. If this
   * is the first snapshot, all documents will be in the list as added
   * changes.
   */
  readonly docChanges: DocumentChange[];

  /** An array of all the documents in the QuerySnapshot. */
  readonly docs: QueryDocumentSnapshot[];

  /** The number of documents in the QuerySnapshot. */
  readonly size: number;

  /** True if there are no documents in the QuerySnapshot. */
  readonly empty: boolean;

  /**
   * Enumerates all of the documents in the QuerySnapshot.
   *
   * @param callback A callback to be called with a `QueryDocumentSnapshot` for
   * each document in the snapshot.
   * @param thisArg The `this` binding for the callback.
   */
  forEach(
    callback: (result: QueryDocumentSnapshot) => void,
    thisArg?: any
  ): void;

  /**
   * Returns true if this `QuerySnapshot` is equal to the provided one.
   *
   * @param other The `QuerySnapshot` to compare against.
   * @return true if this `QuerySnapshot` is equal to the provided one.
   */
  isEqual(other: QuerySnapshot): boolean;
}

/**
 * The type of of a `DocumentChange` may be 'added', 'removed', or 'modified'.
 */
export type DocumentChangeType = 'added' | 'removed' | 'modified';

/**
 * A `DocumentChange` represents a change to the documents matching a query.
 * It contains the document affected and the type of change that occurred.
 */
export interface DocumentChange {
  /** The type of change ('added', 'modified', or 'removed'). */
  readonly type: DocumentChangeType;

  /** The document affected by this change. */
  readonly doc: QueryDocumentSnapshot;

  /**
   * The index of the changed document in the result set immediately prior to
   * this DocumentChange (i.e. supposing that all prior DocumentChange objects
   * have been applied). Is -1 for 'added' events.
   */
  readonly oldIndex: number;

  /**
   * The index of the changed document in the result set immediately after
   * this DocumentChange (i.e. supposing that all prior DocumentChange
   * objects and the current DocumentChange object have been applied).
   * Is -1 for 'removed' events.
   */
  readonly newIndex: number;
}

/**
 * A `CollectionReference` object can be used for adding documents, getting
 * document references, and querying for documents (using the methods
 * inherited from `Query`).
 */
export class CollectionReference extends Query {
  private constructor();

  /** The identifier of the collection. */
  readonly id: string;

  /**
   * A reference to the containing Document if this is a subcollection, else
   * null.
   */
  readonly parent: DocumentReference | null;

  /**
   * A string representing the path of the referenced collection (relative
   * to the root of the database).
   */
  readonly path: string;

  /**
   * Get a `DocumentReference` for the document within the collection at the
   * specified path. If no path is specified, an automatically-generated
   * unique ID will be used for the returned DocumentReference.
   *
   * @param documentPath A slash-separated path to a document.
   * @return The `DocumentReference` instance.
   */
  doc(documentPath?: string): DocumentReference;

  /**
   * Add a new document to this collection with the specified data, assigning
   * it a document ID automatically.
   *
   * @param data An Object containing the data for the new document.
   * @return A Promise resolved with a `DocumentReference` pointing to the
   * newly created document after it has been written to the backend.
   */
  add(data: DocumentData): Promise<DocumentReference>;

  /**
   * Returns true if this `CollectionReference` is equal to the provided one.
   *
   * @param other The `CollectionReference` to compare against.
   * @return true if this `CollectionReference` is equal to the provided one.
   */
  isEqual(other: CollectionReference): boolean;
}

/**
 * Sentinel values that can be used when writing document fields with set()
 * or update().
 */
export class FieldValue {
  private constructor();

  /**
   * Returns a sentinel used with set() or update() to include a
   * server-generated timestamp in the written data.
   */
  static serverTimestamp(): FieldValue;

  /**
   * Returns a sentinel for use with update() to mark a field for deletion.
   */
  static delete(): FieldValue;

  /**
   * Returns true if this `FieldValue` is equal to the provided one.
   *
   * @param other The `FieldValue` to compare against.
   * @return true if this `FieldValue` is equal to the provided one.
   */
  isEqual(other: FieldValue): boolean;
}

/**
 * A FieldPath refers to a field in a document. The path may consist of a
 * single field name (referring to a top-level field in the document), or a
 * list of field names (referring to a nested field in the document).
 */
export class FieldPath {
  /**
   * Creates a FieldPath from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames A list of field names.
   */
  constructor(...fieldNames: string[]);

  /**
   * Returns a special sentinel FieldPath to refer to the ID of a document.
   * It can be used in queries to sort or filter by the document ID.
   */
  static documentId(): FieldPath;

  /**
   * Returns true if this `FieldPath` is equal to the provided one.
   *
   * @param other The `FieldPath` to compare against.
   * @return true if this `FieldPath` is equal to the provided one.
   */
  isEqual(other: FieldPath): boolean;
}

/**
 * The set of Firestore status codes. The codes are the same at the ones
 * exposed by gRPC here:
 * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
 *
 * Possible values:
 * - 'cancelled': The operation was cancelled (typically by the caller).
 * - 'unknown': Unknown error or an error from a different error domain.
 * - 'invalid-argument': Client specified an invalid argument. Note that this
 *   differs from 'failed-precondition'. 'invalid-argument' indicates
 *   arguments that are problematic regardless of the state of the system
 *   (e.g. an invalid field name).
 * - 'deadline-exceeded': Deadline expired before operation could complete.
 *   For operations that change the state of the system, this error may be
 *   returned even if the operation has completed successfully. For example,
 *   a successful response from a server could have been delayed long enough
 *   for the deadline to expire.
 * - 'not-found': Some requested document was not found.
 * - 'already-exists': Some document that we attempted to create already
 *   exists.
 * - 'permission-denied': The caller does not have permission to execute the
 *   specified operation.
 * - 'resource-exhausted': Some resource has been exhausted, perhaps a
 *   per-user quota, or perhaps the entire file system is out of space.
 * - 'failed-precondition': Operation was rejected because the system is not
 *   in a state required for the operation's execution.
 * - 'aborted': The operation was aborted, typically due to a concurrency
 *   issue like transaction aborts, etc.
 * - 'out-of-range': Operation was attempted past the valid range.
 * - 'unimplemented': Operation is not implemented or not supported/enabled.
 * - 'internal': Internal errors. Means some invariants expected by
 *   underlying system has been broken. If you see one of these errors,
 *   something is very broken.
 * - 'unavailable': The service is currently unavailable. This is most likely
 *   a transient condition and may be corrected by retrying with a backoff.
 * - 'data-loss': Unrecoverable data loss or corruption.
 * - 'unauthenticated': The request does not have valid authentication
 *   credentials for the operation.
 */
export type FirestoreErrorCode =
  | 'cancelled'
  | 'unknown'
  | 'invalid-argument'
  | 'deadline-exceeded'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated';

/** An error returned by a Firestore operation. */
// TODO(b/63008957): FirestoreError should extend firebase.FirebaseError
export interface FirestoreError {
  code: FirestoreErrorCode;
  message: string;
  name: string;
  stack?: string;
}

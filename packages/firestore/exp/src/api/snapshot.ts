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

import { DocumentKey } from '../../../src/model/document_key';
import { Document } from '../../../src/model/document';
import { AbstractUserDataWriter } from '../../../src/api/user_data_writer';
import {
  DocumentSnapshot as LiteDocumentSnapshot,
  FirestoreDataConverter as LiteFirestoreDataConverter,
  fieldPathFromArgument
} from '../../../lite/src/api/snapshot';
import { FirebaseFirestore } from './database';
import {
  DocumentData,
  Query,
  queryEqual,
  SetOptions
} from '../../../lite/src/api/reference';
import { SnapshotMetadata } from '../../../src/api/database';
import { Code, FirestoreError } from '../../../src/util/error';
import { ChangeType, ViewSnapshot } from '../../../src/core/view_snapshot';
import { FieldPath } from '../../../lite/src/api/field_path';
import { SnapshotListenOptions } from './reference';
import { UntypedFirestoreDataConverter } from '../../../src/api/user_data_reader';
import { debugAssert, fail } from '../../../src/util/assert';
import { newQueryComparator } from '../../../src/core/query';

/**
 * Converter used by `withConverter()` to transform user objects of type `T`
 * into Firestore data.
 *
 * Using the converter allows you to specify generic type arguments when
 * storing and retrieving objects from Firestore.
 *
 * @example
 * ```typescript
 * class Post {
 *   constructor(readonly title: string, readonly author: string) {}
 *
 *   toString(): string {
 *     return this.title + ', by ' + this.author;
 *   }
 * }
 *
 * const postConverter = {
 *   toFirestore(post: Post): firebase.firestore.DocumentData {
 *     return {title: post.title, author: post.author};
 *   },
 *   fromFirestore(
 *     snapshot: firebase.firestore.QueryDocumentSnapshot,
 *     options: firebase.firestore.SnapshotOptions
 *   ): Post {
 *     const data = snapshot.data(options)!;
 *     return new Post(data.title, data.author);
 *   }
 * };
 *
 * const postSnap = await firebase.firestore()
 *   .collection('posts')
 *   .withConverter(postConverter)
 *   .doc().get();
 * const post = postSnap.data();
 * if (post !== undefined) {
 *   post.title; // string
 *   post.toString(); // Should be defined
 *   post.someNonExistentProperty; // TS error
 * }
 * ```
 */
export interface FirestoreDataConverter<T>
  extends LiteFirestoreDataConverter<T> {
  /**
   * Called by the Firestore SDK to convert a custom model object of type `T`
   * into a plain Javascript object (suitable for writing directly to the
   * Firestore database). To use `set()` with `merge` and `mergeFields`,
   * `toFirestore()` must be defined with `Partial<T>`.
   */
  toFirestore(modelObject: T): DocumentData;

  /**
   * Called by the Firestore SDK to convert a custom model object of type `T`
   * into a plain Javascript object (suitable for writing directly to the
   * Firestore database). Used with {@link setData()}, {@link WriteBatch#set()}
   * and {@link Transaction#set()}} with `merge:true` or `mergeFields`.
   */
  toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;

  /**
   * Called by the Firestore SDK to convert Firestore data into an object of
   * type T. You can access your data by calling: `snapshot.data(options)`.
   *
   * @param snapshot - A `QueryDocumentSnapshot` containing your data and metadata.
   * @param options - The `SnapshotOptions` from the initial call to `data()`.
   */
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    options?: SnapshotOptions
  ): T;
}

/**
 * Options that configure how data is retrieved from a `DocumentSnapshot` (for
 * example the desired behavior for server timestamps that have not yet been set
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

/**
 * The type of a `DocumentChange` may be 'added', 'removed', or 'modified'.
 */
export type DocumentChangeType = 'added' | 'removed' | 'modified';

/**
 * A `DocumentChange` represents a change to the documents matching a query.
 * It contains the document affected and the type of change that occurred.
 */
export interface DocumentChange<T = DocumentData> {
  /** The type of change ('added', 'modified', or 'removed'). */
  readonly type: DocumentChangeType;

  /** The document affected by this change. */
  readonly doc: QueryDocumentSnapshot<T>;

  /**
   * The index of the changed document in the result set immediately prior to
   * this `DocumentChange` (i.e. supposing that all prior `DocumentChange` objects
   * have been applied). Is `-1` for 'added' events.
   */
  readonly oldIndex: number;

  /**
   * The index of the changed document in the result set immediately after
   * this `DocumentChange` (i.e. supposing that all prior `DocumentChange`
   * objects and the current `DocumentChange` object have been applied).
   * Is -1 for 'removed' events.
   */
  readonly newIndex: number;
}

/**
 * A `DocumentSnapshot` contains data read from a document in your Firestore
 * database. The data can be extracted with `.data()` or `.get(<field>)` to
 * get a specific field.
 *
 * For a `DocumentSnapshot` that points to a non-existing document, any data
 * access will return 'undefined'. You can use the `exists()` method to
 * explicitly verify a document's existence.
 */
export class DocumentSnapshot<T = DocumentData> extends LiteDocumentSnapshot<
  T
> {
  private readonly _firestoreImpl: FirebaseFirestore;

  /**
   *  Metadata about the `DocumentSnapshot`, including information about its
   *  source and local modifications.
   */
  readonly metadata: SnapshotMetadata;

  /** @hideconstructor protected */
  constructor(
    readonly _firestore: FirebaseFirestore,
    userDataWriter: AbstractUserDataWriter,
    key: DocumentKey,
    document: Document | null,
    metadata: SnapshotMetadata,
    converter: UntypedFirestoreDataConverter<T> | null
  ) {
    super(_firestore, userDataWriter, key, document, converter);
    this._firestoreImpl = _firestore;
    this.metadata = metadata;
  }

  /**
   * Property of the `DocumentSnapshot` that signals whether or not the data
   * exists. True if the document exists.
   */
  exists(): this is QueryDocumentSnapshot<T> {
    return super.exists();
  }

  /**
   * Retrieves all fields in the document as an `Object`. Returns `undefined` if
   * the document doesn't exist.
   *
   * By default, `FieldValue.serverTimestamp()` values that have not yet been
   * set to their final value will be returned as `null`. You can override
   * this by passing an options object.
   *
   * @param options - An options object to configure how data is retrieved from
   * the snapshot (for example the desired behavior for server timestamps that
   * have not yet been set to their final value).
   * @returns An `Object` containing all fields in the document or `undefined` if
   * the document doesn't exist.
   */
  data(options: SnapshotOptions = {}): T | undefined {
    if (!this._document) {
      return undefined;
    } else if (this._converter) {
      // We only want to use the converter and create a new DocumentSnapshot
      // if a converter has been provided.
      const snapshot = new QueryDocumentSnapshot(
        this._firestore,
        this._userDataWriter,
        this._key,
        this._document,
        this.metadata,
        /* converter= */ null
      );
      return this._converter.fromFirestore(snapshot, options);
    } else {
      return this._userDataWriter.convertValue(
        this._document.toProto(),
        options.serverTimestamps
      ) as T;
    }
  }

  /**
   * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
   * document or field doesn't exist.
   *
   * By default, a `FieldValue.serverTimestamp()` that has not yet been set to
   * its final value will be returned as `null`. You can override this by
   * passing an options object.
   *
   * @param fieldPath - The path (for example 'foo' or 'foo.bar') to a specific
   * field.
   * @param options - An options object to configure how the field is retrieved
   * from the snapshot (for example the desired behavior for server timestamps
   * that have not yet been set to their final value).
   * @returns The data at the specified field location or undefined if no such
   * field exists in the document.
   */
  // We are using `any` here to avoid an explicit cast by our users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(fieldPath: string | FieldPath, options: SnapshotOptions = {}): any {
    if (this._document) {
      const value = this._document
        .data()
        .field(fieldPathFromArgument('DocumentSnapshot.get', fieldPath));
      if (value !== null) {
        return this._userDataWriter.convertValue(
          value,
          options.serverTimestamps
        );
      }
    }
    return undefined;
  }
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
export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<
  T
> {
  /**
   * Retrieves all fields in the document as an `Object`.
   *
   * By default, `FieldValue.serverTimestamp()` values that have not yet been
   * set to their final value will be returned as `null`. You can override
   * this by passing an options object.
   *
   * @override
   * @param options - An options object to configure how data is retrieved from
   * the snapshot (for example the desired behavior for server timestamps that
   * have not yet been set to their final value).
   * @returns An `Object` containing all fields in the document.
   */
  data(options: SnapshotOptions = {}): T {
    return super.data(options) as T;
  }
}

/**
 * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
 * representing the results of a query. The documents can be accessed as an
 * array via the `docs` property or enumerated using the `forEach` method. The
 * number of documents can be determined via the `empty` and `size`
 * properties.
 */
export class QuerySnapshot<T = DocumentData> {
  /**
   * Metadata about this snapshot, concerning its source and if it has local
   * modifications.
   */
  readonly metadata: SnapshotMetadata;

  /**
   * The query on which you called `get` or `onSnapshot` in order to get this
   * `QuerySnapshot`.
   */
  readonly query: Query<T>;

  private _cachedChanges?: Array<DocumentChange<T>>;
  private _cachedChangesIncludeMetadataChanges?: boolean;

  /** @hideconstructor */
  constructor(
    readonly _firestore: FirebaseFirestore,
    readonly _userDataWriter: AbstractUserDataWriter,
    query: Query<T>,
    readonly _snapshot: ViewSnapshot
  ) {
    this.metadata = new SnapshotMetadata(
      _snapshot.hasPendingWrites,
      _snapshot.fromCache
    );
    this.query = query;
  }

  /** An array of all the documents in the `QuerySnapshot`. */
  get docs(): Array<QueryDocumentSnapshot<T>> {
    const result: Array<QueryDocumentSnapshot<T>> = [];
    this.forEach(doc => result.push(doc));
    return result;
  }

  /** The number of documents in the `QuerySnapshot`. */
  get size(): number {
    return this._snapshot.docs.size;
  }

  /** True if there are no documents in the `QuerySnapshot`. */
  get empty(): boolean {
    return this.size === 0;
  }

  /**
   * Enumerates all of the documents in the `QuerySnapshot`.
   *
   * @param callback - A callback to be called with a `QueryDocumentSnapshot` for
   * each document in the snapshot.
   * @param thisArg - The `this` binding for the callback.
   */
  forEach(
    callback: (result: QueryDocumentSnapshot<T>) => void,
    thisArg?: unknown
  ): void {
    this._snapshot.docs.forEach(doc => {
      callback.call(
        thisArg,
        new QueryDocumentSnapshot<T>(
          this._firestore,
          this._userDataWriter,
          doc.key,
          doc,
          new SnapshotMetadata(
            this._snapshot.mutatedKeys.has(doc.key),
            this._snapshot.fromCache
          ),
          this.query._converter
        )
      );
    });
  }

  /**
   * Returns an array of the documents changes since the last snapshot. If this
   * is the first snapshot, all documents will be in the list as 'added'
   * changes.
   *
   * @param options - `SnapshotListenOptions` that control whether metadata-only
   * changes (i.e. only `DocumentSnapshot.metadata` changed) should trigger
   * snapshot events.
   */
  docChanges(options: SnapshotListenOptions = {}): Array<DocumentChange<T>> {
    const includeMetadataChanges = !!options.includeMetadataChanges;

    if (includeMetadataChanges && this._snapshot.excludesMetadataChanges) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'To include metadata changes with your document changes, you must ' +
          'also pass { includeMetadataChanges:true } to onSnapshot().'
      );
    }

    if (
      !this._cachedChanges ||
      this._cachedChangesIncludeMetadataChanges !== includeMetadataChanges
    ) {
      this._cachedChanges = changesFromSnapshot(this, includeMetadataChanges);
      this._cachedChangesIncludeMetadataChanges = includeMetadataChanges;
    }

    return this._cachedChanges;
  }
}

/** Calculates the array of DocumentChanges for a given ViewSnapshot. */
export function changesFromSnapshot<T>(
  querySnapshot: QuerySnapshot<T>,
  includeMetadataChanges: boolean
): Array<DocumentChange<T>> {
  if (querySnapshot._snapshot.oldDocs.isEmpty()) {
    // Special case the first snapshot because index calculation is easy and
    // fast
    let lastDoc: Document;
    let index = 0;
    return querySnapshot._snapshot.docChanges.map(change => {
      debugAssert(
        change.type === ChangeType.Added,
        'Invalid event type for first snapshot'
      );
      debugAssert(
        !lastDoc ||
          newQueryComparator(querySnapshot._snapshot.query)(
            lastDoc,
            change.doc
          ) < 0,
        'Got added events in wrong order'
      );
      const doc = new QueryDocumentSnapshot<T>(
        querySnapshot._firestore,
        querySnapshot._userDataWriter,
        change.doc.key,
        change.doc,
        new SnapshotMetadata(
          querySnapshot._snapshot.mutatedKeys.has(change.doc.key),
          querySnapshot._snapshot.fromCache
        ),
        querySnapshot.query._converter
      );
      lastDoc = change.doc;
      return {
        type: 'added' as DocumentChangeType,
        doc,
        oldIndex: -1,
        newIndex: index++
      };
    });
  } else {
    // A DocumentSet that is updated incrementally as changes are applied to use
    // to lookup the index of a document.
    let indexTracker = querySnapshot._snapshot.oldDocs;
    return querySnapshot._snapshot.docChanges
      .filter(
        change => includeMetadataChanges || change.type !== ChangeType.Metadata
      )
      .map(change => {
        const doc = new QueryDocumentSnapshot<T>(
          querySnapshot._firestore,
          querySnapshot._userDataWriter,
          change.doc.key,
          change.doc,
          new SnapshotMetadata(
            querySnapshot._snapshot.mutatedKeys.has(change.doc.key),
            querySnapshot._snapshot.fromCache
          ),
          querySnapshot.query._converter
        );
        let oldIndex = -1;
        let newIndex = -1;
        if (change.type !== ChangeType.Added) {
          oldIndex = indexTracker.indexOf(change.doc.key);
          debugAssert(oldIndex >= 0, 'Index for document not found');
          indexTracker = indexTracker.delete(change.doc.key);
        }
        if (change.type !== ChangeType.Removed) {
          indexTracker = indexTracker.add(change.doc);
          newIndex = indexTracker.indexOf(change.doc.key);
        }
        return {
          type: resultChangeType(change.type),
          doc,
          oldIndex,
          newIndex
        };
      });
  }
}

export function resultChangeType(type: ChangeType): DocumentChangeType {
  switch (type) {
    case ChangeType.Added:
      return 'added';
    case ChangeType.Modified:
    case ChangeType.Metadata:
      return 'modified';
    case ChangeType.Removed:
      return 'removed';
    default:
      return fail('Unknown change type: ' + type);
  }
}

// TODO(firestoreexp): Add tests for snapshotEqual with different snapshot
// metadata
/**
 * Returns true if the provided snapshots are equal.
 *
 * @param left - A snapshot to compare.
 * @param right - A snapshot to compare.
 * @returns true if the snapshots are equal.
 */
export function snapshotEqual<T>(
  left: DocumentSnapshot<T> | QuerySnapshot<T>,
  right: DocumentSnapshot<T> | QuerySnapshot<T>
): boolean {
  if (left instanceof DocumentSnapshot && right instanceof DocumentSnapshot) {
    return (
      left._firestore === right._firestore &&
      left._key.isEqual(right._key) &&
      (left._document === null
        ? right._document === null
        : left._document.isEqual(right._document)) &&
      left._converter === right._converter
    );
  } else if (left instanceof QuerySnapshot && right instanceof QuerySnapshot) {
    return (
      left._firestore === right._firestore &&
      queryEqual(left.query, right.query) &&
      left.metadata.isEqual(right.metadata) &&
      left._snapshot.isEqual(right._snapshot)
    );
  }

  return false;
}

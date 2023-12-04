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

import { Compat, getModularInstance } from '@firebase/util';

import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { FieldPath as InternalFieldPath } from '../model/path';
import { arrayEquals } from '../util/misc';

import { Firestore } from './database';
import { FieldPath } from './field_path';
import {
  DocumentData,
  DocumentReference,
  PartialWithFieldValue,
  Query,
  queryEqual,
  SetOptions,
  WithFieldValue
} from './reference';
import {
  fieldPathFromDotSeparatedString,
  UntypedFirestoreDataConverter
} from './user_data_reader';
import { AbstractUserDataWriter } from './user_data_writer';

/**
 * Converter used by `withConverter()` to transform user objects of type
 * `AppModelType` into Firestore data of type `DbModelType`.
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
 * interface PostDbModel {
 *   title: string;
 *   author: string;
 * }
 *
 * const postConverter = {
 *   toFirestore(post: WithFieldValue<Post>): PostDbModel {
 *     return {title: post.title, author: post.author};
 *   },
 *   fromFirestore(snapshot: QueryDocumentSnapshot): Post {
 *     const data = snapshot.data(options) as PostDbModel;
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
export interface FirestoreDataConverter<
  AppModelType,
  DbModelType extends DocumentData = DocumentData
> {
  /**
   * Called by the Firestore SDK to convert a custom model object of type
   * `AppModelType` into a plain Javascript object (suitable for writing
   * directly to the Firestore database) of type `DbModelType`. Used with
   * {@link @firebase/firestore/lite#(setDoc:1)},
   * {@link @firebase/firestore/lite#(WriteBatch.set:1)} and
   * {@link @firebase/firestore/lite#(Transaction.set:1)}.
   *
   * The `WithFieldValue<T>` type extends `T` to also allow FieldValues such as
   * {@link (deleteField:1)} to be used as property values.
   */
  toFirestore(
    modelObject: WithFieldValue<AppModelType>
  ): WithFieldValue<DbModelType>;

  /**
   * Called by the Firestore SDK to convert a custom model object of type
   * `AppModelType` into a plain Javascript object (suitable for writing
   * directly to the Firestore database) of type `DbModelType`. Used with
   * {@link @firebase/firestore/lite#(setDoc:1)},
   * {@link @firebase/firestore/lite#(WriteBatch.set:1)} and
   * {@link @firebase/firestore/lite#(Transaction.set:1)} with `merge:true`
   * or `mergeFields`.
   *
   * The `PartialWithFieldValue<T>` type extends `Partial<T>` to allow
   * FieldValues such as {@link (arrayUnion:1)} to be used as property values.
   * It also supports nested `Partial` by allowing nested fields to be
   * omitted.
   */
  toFirestore(
    modelObject: PartialWithFieldValue<AppModelType>,
    options: SetOptions
  ): PartialWithFieldValue<DbModelType>;

  /**
   * Called by the Firestore SDK to convert Firestore data into an object of
   * type `AppModelType`. You can access your data by calling:
   * `snapshot.data()`.
   *
   * Generally, the data returned from `snapshot.data()` can be cast to
   * `DbModelType`; however, this is not guaranteed as writes to the database
   * may have occurred without a type converter enforcing this specific layout.
   *
   * @param snapshot - A `QueryDocumentSnapshot` containing your data and
   * metadata.
   */
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>
  ): AppModelType;
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
export class DocumentSnapshot<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  // Note: This class is stripped down version of the DocumentSnapshot in
  // the legacy SDK. The changes are:
  // - No support for SnapshotMetadata.
  // - No support for SnapshotOptions.

  /** @hideconstructor protected */
  constructor(
    public _firestore: Firestore,
    public _userDataWriter: AbstractUserDataWriter,
    public _key: DocumentKey,
    public _document: Document | null,
    public _converter: UntypedFirestoreDataConverter<
      AppModelType,
      DbModelType
    > | null
  ) {}

  /** Property of the `DocumentSnapshot` that provides the document's ID. */
  get id(): string {
    return this._key.path.lastSegment();
  }

  /**
   * The `DocumentReference` for the document included in the `DocumentSnapshot`.
   */
  get ref(): DocumentReference<AppModelType, DbModelType> {
    return new DocumentReference<AppModelType, DbModelType>(
      this._firestore,
      this._converter,
      this._key
    );
  }

  /**
   * Signals whether or not the document at the snapshot's location exists.
   *
   * @returns true if the document exists.
   */
  exists(): this is QueryDocumentSnapshot<AppModelType, DbModelType> {
    return this._document !== null;
  }

  /**
   * Retrieves all fields in the document as an `Object`. Returns `undefined` if
   * the document doesn't exist.
   *
   * @returns An `Object` containing all fields in the document or `undefined`
   * if the document doesn't exist.
   */
  data(): AppModelType | undefined {
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
        /* converter= */ null
      );
      return this._converter.fromFirestore(snapshot);
    } else {
      return this._userDataWriter.convertValue(
        this._document.data.value
      ) as AppModelType;
    }
  }

  /**
   * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
   * document or field doesn't exist.
   *
   * @param fieldPath - The path (for example 'foo' or 'foo.bar') to a specific
   * field.
   * @returns The data at the specified field location or undefined if no such
   * field exists in the document.
   */
  // We are using `any` here to avoid an explicit cast by our users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(fieldPath: string | FieldPath): any {
    if (this._document) {
      const value = this._document.data.field(
        fieldPathFromArgument('DocumentSnapshot.get', fieldPath)
      );
      if (value !== null) {
        return this._userDataWriter.convertValue(value);
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
export class QueryDocumentSnapshot<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> extends DocumentSnapshot<AppModelType, DbModelType> {
  /**
   * Retrieves all fields in the document as an `Object`.
   *
   * @override
   * @returns An `Object` containing all fields in the document.
   */
  data(): AppModelType {
    return super.data() as AppModelType;
  }
}

/**
 * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
 * representing the results of a query. The documents can be accessed as an
 * array via the `docs` property or enumerated using the `forEach` method. The
 * number of documents can be determined via the `empty` and `size`
 * properties.
 */
export class QuerySnapshot<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  /**
   * The query on which you called {@link getDocs} in order to get this
   * `QuerySnapshot`.
   */
  readonly query: Query<AppModelType, DbModelType>;

  /** @hideconstructor */
  constructor(
    _query: Query<AppModelType, DbModelType>,
    readonly _docs: Array<QueryDocumentSnapshot<AppModelType, DbModelType>>
  ) {
    this.query = _query;
  }

  /** An array of all the documents in the `QuerySnapshot`. */
  get docs(): Array<QueryDocumentSnapshot<AppModelType, DbModelType>> {
    return [...this._docs];
  }

  /** The number of documents in the `QuerySnapshot`. */
  get size(): number {
    return this.docs.length;
  }

  /** True if there are no documents in the `QuerySnapshot`. */
  get empty(): boolean {
    return this.docs.length === 0;
  }

  /**
   * Enumerates all of the documents in the `QuerySnapshot`.
   *
   * @param callback - A callback to be called with a `QueryDocumentSnapshot` for
   * each document in the snapshot.
   * @param thisArg - The `this` binding for the callback.
   */
  forEach(
    callback: (
      result: QueryDocumentSnapshot<AppModelType, DbModelType>
    ) => void,
    thisArg?: unknown
  ): void {
    this._docs.forEach(callback, thisArg);
  }
}

/**
 * Returns true if the provided snapshots are equal.
 *
 * @param left - A snapshot to compare.
 * @param right - A snapshot to compare.
 * @returns true if the snapshots are equal.
 */
export function snapshotEqual<AppModelType, DbModelType extends DocumentData>(
  left:
    | DocumentSnapshot<AppModelType, DbModelType>
    | QuerySnapshot<AppModelType, DbModelType>,
  right:
    | DocumentSnapshot<AppModelType, DbModelType>
    | QuerySnapshot<AppModelType, DbModelType>
): boolean {
  left = getModularInstance(left);
  right = getModularInstance(right);

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
      queryEqual(left.query, right.query) &&
      arrayEquals(left.docs, right.docs, snapshotEqual)
    );
  }

  return false;
}

/**
 * Helper that calls `fromDotSeparatedString()` but wraps any error thrown.
 */
export function fieldPathFromArgument(
  methodName: string,
  arg: string | FieldPath | Compat<FieldPath>
): InternalFieldPath {
  if (typeof arg === 'string') {
    return fieldPathFromDotSeparatedString(methodName, arg);
  } else if (arg instanceof FieldPath) {
    return arg._internalPath;
  } else {
    return arg._delegate._internalPath;
  }
}

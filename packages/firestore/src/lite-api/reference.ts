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

import { getModularInstance } from '@firebase/util';

import {
  newQueryForCollectionGroup,
  newQueryForPath,
  Query as InternalQuery,
  queryEquals
} from '../core/query';
import { DocumentKey } from '../model/document_key';
import { ResourcePath } from '../model/path';
import { Code, FirestoreError } from '../util/error';
import {
  cast,
  validateCollectionPath,
  validateDocumentPath,
  validateNonEmptyArgument
} from '../util/input_validation';
import { AutoId } from '../util/misc';

import { Firestore } from './database';
import { FieldPath } from './field_path';
import { FieldValue } from './field_value';
import { FirestoreDataConverter } from './snapshot';
import { NestedUpdateFields, Primitive } from './types';

/**
 * Document data (for use with {@link @firebase/firestore/lite#(setDoc:1)}) consists of fields mapped to
 * values.
 */
export interface DocumentData {
  /** A mapping between a field and its value. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

/**
 * Similar to Typescript's `Partial<T>`, but allows nested fields to be
 * omitted and FieldValues to be passed in as property values.
 */
export type PartialWithFieldValue<T> =
  | Partial<T>
  | (T extends Primitive
      ? T
      : T extends {}
      ? { [K in keyof T]?: PartialWithFieldValue<T[K]> | FieldValue }
      : never);

/**
 * Allows FieldValues to be passed in as a property value while maintaining
 * type safety.
 */
export type WithFieldValue<T> =
  | T
  | (T extends Primitive
      ? T
      : T extends {}
      ? { [K in keyof T]: WithFieldValue<T[K]> | FieldValue }
      : never);

/**
 * Update data (for use with {@link (updateDoc:1)}) that consists of field paths
 * (e.g. 'foo' or 'foo.baz') mapped to values. Fields that contain dots
 * reference nested fields within the document. FieldValues can be passed in
 * as property values.
 */
export type UpdateData<T> = T extends Primitive
  ? T
  : T extends {}
  ? { [K in keyof T]?: UpdateData<T[K]> | FieldValue } & NestedUpdateFields<T>
  : Partial<T>;
/**
 * An options object that configures the behavior of {@link @firebase/firestore/lite#(setDoc:1)}, {@link
 * @firebase/firestore/lite#(WriteBatch.set:1)} and {@link @firebase/firestore/lite#(Transaction.set:1)} calls. These calls can be
 * configured to perform granular merges instead of overwriting the target
 * documents in their entirety by providing a `SetOptions` with `merge: true`.
 *
 * @param merge - Changes the behavior of a `setDoc()` call to only replace the
 * values specified in its data argument. Fields omitted from the `setDoc()`
 * call remain untouched. If your input sets any field to an empty map, all
 * nested fields are overwritten.
 * @param mergeFields - Changes the behavior of `setDoc()` calls to only replace
 * the specified field paths. Any field path that is not specified is ignored
 * and remains untouched. If your input sets any field to an empty map, all
 * nested fields are overwritten.
 */
export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };

/**
 * A `Query` refers to a query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export class Query<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  /** The type of this Firestore reference. */
  readonly type: 'query' | 'collection' = 'query';

  /**
   * The `Firestore` instance for the Firestore database (useful for performing
   * transactions, etc.).
   */
  readonly firestore: Firestore;

  // This is the lite version of the Query class in the main SDK.

  /** @hideconstructor protected */
  constructor(
    firestore: Firestore,
    /**
     * If provided, the `FirestoreDataConverter` associated with this instance.
     */
    readonly converter: FirestoreDataConverter<
      AppModelType,
      DbModelType
    > | null,
    readonly _query: InternalQuery
  ) {
    this.firestore = firestore;
  }

  /**
   * Removes the current converter.
   *
   * @param converter - `null` removes the current converter.
   * @returns A `Query<DocumentData, DocumentData>` that does not use a
   * converter.
   */
  withConverter(converter: null): Query<DocumentData, DocumentData>;
  /**
   * Applies a custom data converter to this query, allowing you to use your own
   * custom model objects with Firestore. When you call {@link getDocs} with
   * the returned query, the provided converter will convert between Firestore
   * data of type `NewDbModelType` and your custom type `NewAppModelType`.
   *
   * @param converter - Converts objects to and from Firestore.
   * @returns A `Query` that uses the provided converter.
   */
  withConverter<
    NewAppModelType,
    NewDbModelType extends DocumentData = DocumentData
  >(
    converter: FirestoreDataConverter<NewAppModelType, NewDbModelType>
  ): Query<NewAppModelType, NewDbModelType>;
  withConverter<
    NewAppModelType,
    NewDbModelType extends DocumentData = DocumentData
  >(
    converter: FirestoreDataConverter<NewAppModelType, NewDbModelType> | null
  ): Query<NewAppModelType, NewDbModelType> {
    return new Query<NewAppModelType, NewDbModelType>(
      this.firestore,
      converter,
      this._query
    );
  }
}

/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist.
 */
export class DocumentReference<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  /** The type of this Firestore reference. */
  readonly type = 'document';

  /**
   * The {@link Firestore} instance the document is in.
   * This is useful for performing transactions, for example.
   */
  readonly firestore: Firestore;

  /** @hideconstructor */
  constructor(
    firestore: Firestore,
    /**
     * If provided, the `FirestoreDataConverter` associated with this instance.
     */
    readonly converter: FirestoreDataConverter<
      AppModelType,
      DbModelType
    > | null,
    readonly _key: DocumentKey
  ) {
    this.firestore = firestore;
  }

  get _path(): ResourcePath {
    return this._key.path;
  }

  /**
   * The document's identifier within its collection.
   */
  get id(): string {
    return this._key.path.lastSegment();
  }

  /**
   * A string representing the path of the referenced document (relative
   * to the root of the database).
   */
  get path(): string {
    return this._key.path.canonicalString();
  }

  /**
   * The collection this `DocumentReference` belongs to.
   */
  get parent(): CollectionReference<AppModelType, DbModelType> {
    return new CollectionReference<AppModelType, DbModelType>(
      this.firestore,
      this.converter,
      this._key.path.popLast()
    );
  }

  /**
   * Applies a custom data converter to this `DocumentReference`, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * @firebase/firestore/lite#(setDoc:1)}, {@link @firebase/firestore/lite#getDoc}, etc. with the returned `DocumentReference`
   * instance, the provided converter will convert between Firestore data of
   * type `NewDbModelType` and your custom type `NewAppModelType`.
   *
   * @param converter - Converts objects to and from Firestore.
   * @returns A `DocumentReference` that uses the provided converter.
   */
  withConverter<
    NewAppModelType,
    NewDbModelType extends DocumentData = DocumentData
  >(
    converter: FirestoreDataConverter<NewAppModelType, NewDbModelType>
  ): DocumentReference<NewAppModelType, NewDbModelType>;
  /**
   * Removes the current converter.
   *
   * @param converter - `null` removes the current converter.
   * @returns A `DocumentReference<DocumentData, DocumentData>` that does not
   * use a converter.
   */
  withConverter(converter: null): DocumentReference<DocumentData, DocumentData>;
  withConverter<
    NewAppModelType,
    NewDbModelType extends DocumentData = DocumentData
  >(
    converter: FirestoreDataConverter<NewAppModelType, NewDbModelType> | null
  ): DocumentReference<NewAppModelType, NewDbModelType> {
    return new DocumentReference<NewAppModelType, NewDbModelType>(
      this.firestore,
      converter,
      this._key
    );
  }
}

/**
 * A `CollectionReference` object can be used for adding documents, getting
 * document references, and querying for documents (using {@link (query:1)}).
 */
export class CollectionReference<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> extends Query<AppModelType, DbModelType> {
  /** The type of this Firestore reference. */
  readonly type = 'collection';

  /** @hideconstructor */
  constructor(
    firestore: Firestore,
    converter: FirestoreDataConverter<AppModelType, DbModelType> | null,
    readonly _path: ResourcePath
  ) {
    super(firestore, converter, newQueryForPath(_path));
  }

  /** The collection's identifier. */
  get id(): string {
    return this._query.path.lastSegment();
  }

  /**
   * A string representing the path of the referenced collection (relative
   * to the root of the database).
   */
  get path(): string {
    return this._query.path.canonicalString();
  }

  /**
   * A reference to the containing `DocumentReference` if this is a
   * subcollection. If this isn't a subcollection, the reference is null.
   */
  get parent(): DocumentReference<DocumentData, DocumentData> | null {
    const parentPath = this._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        this.firestore,
        /* converter= */ null,
        new DocumentKey(parentPath)
      );
    }
  }

  /**
   * Applies a custom data converter to this `CollectionReference`, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * addDoc} with the returned `CollectionReference` instance, the provided
   * converter will convert between Firestore data of type `NewDbModelType` and
   * your custom type `NewAppModelType`.
   *
   * @param converter - Converts objects to and from Firestore.
   * @returns A `CollectionReference` that uses the provided converter.
   */
  withConverter<
    NewAppModelType,
    NewDbModelType extends DocumentData = DocumentData
  >(
    converter: FirestoreDataConverter<NewAppModelType, NewDbModelType>
  ): CollectionReference<NewAppModelType, NewDbModelType>;
  /**
   * Removes the current converter.
   *
   * @param converter - `null` removes the current converter.
   * @returns A `CollectionReference<DocumentData, DocumentData>` that does not
   * use a converter.
   */
  withConverter(
    converter: null
  ): CollectionReference<DocumentData, DocumentData>;
  withConverter<
    NewAppModelType,
    NewDbModelType extends DocumentData = DocumentData
  >(
    converter: FirestoreDataConverter<NewAppModelType, NewDbModelType> | null
  ): CollectionReference<NewAppModelType, NewDbModelType> {
    return new CollectionReference<NewAppModelType, NewDbModelType>(
      this.firestore,
      converter,
      this._path
    );
  }
}

/**
 * Gets a `CollectionReference` instance that refers to the collection at
 * the specified absolute path.
 *
 * @param firestore - A reference to the root `Firestore` instance.
 * @param path - A slash-separated path to a collection.
 * @param pathSegments - Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @returns The `CollectionReference` instance.
 */
export function collection(
  firestore: Firestore,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData, DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference - A reference to a collection.
 * @param path - A slash-separated path to a collection.
 * @param pathSegments - Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @returns The `CollectionReference` instance.
 */
export function collection<AppModelType, DbModelType extends DocumentData>(
  reference: CollectionReference<AppModelType, DbModelType>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData, DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference - A reference to a Firestore document.
 * @param path - A slash-separated path to a collection.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @returns The `CollectionReference` instance.
 */
export function collection<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData, DocumentData>;
export function collection<AppModelType, DbModelType extends DocumentData>(
  parent:
    | Firestore
    | DocumentReference<AppModelType, DbModelType>
    | CollectionReference<AppModelType, DbModelType>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData, DocumentData> {
  parent = getModularInstance(parent);

  validateNonEmptyArgument('collection', 'path', path);
  if (parent instanceof Firestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathSegments);
    validateCollectionPath(absolutePath);
    return new CollectionReference(parent, /* converter= */ null, absolutePath);
  } else {
    if (
      !(parent instanceof DocumentReference) &&
      !(parent instanceof CollectionReference)
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Expected first argument to collection() to be a CollectionReference, ' +
          'a DocumentReference or FirebaseFirestore'
      );
    }
    const absolutePath = parent._path.child(
      ResourcePath.fromString(path, ...pathSegments)
    );
    validateCollectionPath(absolutePath);
    return new CollectionReference(
      parent.firestore,
      /* converter= */ null,
      absolutePath
    );
  }
}

// TODO(firestorelite): Consider using ErrorFactory -
// https://github.com/firebase/firebase-js-sdk/blob/0131e1f/packages/util/src/errors.ts#L106

/**
 * Creates and returns a new `Query` instance that includes all documents in the
 * database that are contained in a collection or subcollection with the
 * given `collectionId`.
 *
 * @param firestore - A reference to the root `Firestore` instance.
 * @param collectionId - Identifies the collections to query over. Every
 * collection or subcollection with this ID as the last segment of its path
 * will be included. Cannot contain a slash.
 * @returns The created `Query`.
 */
export function collectionGroup(
  firestore: Firestore,
  collectionId: string
): Query<DocumentData, DocumentData> {
  firestore = cast(firestore, Firestore);

  validateNonEmptyArgument('collectionGroup', 'collection id', collectionId);
  if (collectionId.indexOf('/') >= 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid collection ID '${collectionId}' passed to function ` +
        `collectionGroup(). Collection IDs must not contain '/'.`
    );
  }

  return new Query(
    firestore,
    /* converter= */ null,
    newQueryForCollectionGroup(collectionId)
  );
}

/**
 * Gets a `DocumentReference` instance that refers to the document at the
 * specified absolute path.
 *
 * @param firestore - A reference to the root `Firestore` instance.
 * @param path - A slash-separated path to a document.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @returns The `DocumentReference` instance.
 */
export function doc(
  firestore: Firestore,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData, DocumentData>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path. If no path is specified, an
 * automatically-generated unique ID will be used for the returned
 * `DocumentReference`.
 *
 * @param reference - A reference to a collection.
 * @param path - A slash-separated path to a document. Has to be omitted to use
 * auto-genrated IDs.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @returns The `DocumentReference` instance.
 */
export function doc<AppModelType, DbModelType extends DocumentData>(
  reference: CollectionReference<AppModelType, DbModelType>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<AppModelType, DbModelType>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path.
 *
 * @param reference - A reference to a Firestore document.
 * @param path - A slash-separated path to a document.
 * @param pathSegments - Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @returns The `DocumentReference` instance.
 */
export function doc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData, DocumentData>;
export function doc<AppModelType, DbModelType extends DocumentData>(
  parent:
    | Firestore
    | CollectionReference<AppModelType, DbModelType>
    | DocumentReference<AppModelType, DbModelType>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<AppModelType, DbModelType> {
  parent = getModularInstance(parent);

  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    path = AutoId.newId();
  }
  validateNonEmptyArgument('doc', 'path', path);

  if (parent instanceof Firestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathSegments);
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent,
      /* converter= */ null,
      new DocumentKey(absolutePath)
    );
  } else {
    if (
      !(parent instanceof DocumentReference) &&
      !(parent instanceof CollectionReference)
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Expected first argument to collection() to be a CollectionReference, ' +
          'a DocumentReference or FirebaseFirestore'
      );
    }
    const absolutePath = parent._path.child(
      ResourcePath.fromString(path, ...pathSegments)
    );
    validateDocumentPath(absolutePath);
    return new DocumentReference<AppModelType, DbModelType>(
      parent.firestore,
      parent instanceof CollectionReference ? parent.converter : null,
      new DocumentKey(absolutePath)
    );
  }
}

/**
 * Returns true if the provided references are equal.
 *
 * @param left - A reference to compare.
 * @param right - A reference to compare.
 * @returns true if the references point to the same location in the same
 * Firestore database.
 */
export function refEqual<AppModelType, DbModelType extends DocumentData>(
  left:
    | DocumentReference<AppModelType, DbModelType>
    | CollectionReference<AppModelType, DbModelType>,
  right:
    | DocumentReference<AppModelType, DbModelType>
    | CollectionReference<AppModelType, DbModelType>
): boolean {
  left = getModularInstance(left);
  right = getModularInstance(right);

  if (
    (left instanceof DocumentReference ||
      left instanceof CollectionReference) &&
    (right instanceof DocumentReference || right instanceof CollectionReference)
  ) {
    return (
      left.firestore === right.firestore &&
      left.path === right.path &&
      left.converter === right.converter
    );
  }
  return false;
}

/**
 * Returns true if the provided queries point to the same collection and apply
 * the same constraints.
 *
 * @param left - A `Query` to compare.
 * @param right - A `Query` to compare.
 * @returns true if the references point to the same location in the same
 * Firestore database.
 */
export function queryEqual<AppModelType, DbModelType extends DocumentData>(
  left: Query<AppModelType, DbModelType>,
  right: Query<AppModelType, DbModelType>
): boolean {
  left = getModularInstance(left);
  right = getModularInstance(right);

  if (left instanceof Query && right instanceof Query) {
    return (
      left.firestore === right.firestore &&
      queryEquals(left._query, right._query) &&
      left.converter === right.converter
    );
  }
  return false;
}

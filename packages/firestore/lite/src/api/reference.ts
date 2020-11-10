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

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { FirebaseFirestore } from './database';
import {
  ParsedUpdateData,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import {
  Bound,
  Direction,
  hasLimitToLast,
  LimitType,
  newQueryForCollectionGroup,
  newQueryForPath,
  Operator,
  Query as InternalQuery,
  queryEquals,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithEndAt,
  queryWithLimit,
  queryWithStartAt
} from '../../../src/core/query';
import {
  FieldPath as InternalFieldPath,
  ResourcePath
} from '../../../src/model/path';
import { AutoId } from '../../../src/util/misc';
import {
  DocumentSnapshot,
  fieldPathFromArgument,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  QuerySnapshot
} from './snapshot';
import {
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc,
  invokeRunQueryRpc
} from '../../../src/remote/datastore';
import { hardAssert } from '../../../src/util/assert';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import {
  applyFirestoreDataConverter,
  newQueryBoundFromDocument,
  newQueryBoundFromFields,
  newQueryFilter,
  newQueryOrderBy,
  validateHasExplicitOrderByForLimitToLast
} from '../../../src/api/database';
import { FieldPath } from './field_path';
import {
  cast,
  validateCollectionPath,
  validateDocumentPath,
  validateNonEmptyArgument,
  validatePositiveNumber
} from '../../../src/util/input_validation';
import { newSerializer } from '../../../src/platform/serializer';
import { Code, FirestoreError } from '../../../src/util/error';
import { getDatastore } from './components';
import { Compat } from '../../../src/compat/compat';

/**
 * Document data (for use with {@link setDoc()}) consists of fields mapped to
 * values.
 */
export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

/**
 * Update data (for use with {@link updateDoc()}) consists of field paths (e.g.
 * 'foo' or 'foo.baz') mapped to values. Fields that contain dots reference
 * nested fields within the document.
 */
export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };

/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist.
 */
export class DocumentReference<T = DocumentData> {
  /** The type of this Firestore reference. */
  readonly type = 'document';

  /**
   * The {@link FirebaseFirestore} the document is in.
   * This is useful for performing transactions, for example.
   */
  readonly firestore: FirebaseFirestore;

  constructor(
    firestore: FirebaseFirestore,
    readonly _converter: FirestoreDataConverter<T> | null,
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
  get parent(): CollectionReference<T> {
    return new CollectionReference<T>(
      this.firestore,
      this._converter,
      this._key.path.popLast()
    );
  }

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
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, converter, this._key);
  }
}

/**
 * A `Query` refers to a Query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export class Query<T = DocumentData> {
  /** The type of this Firestore reference. */
  readonly type: 'query' | 'collection' = 'query';

  /**
   * The `FirebaseFirestore` for the Firestore database (useful for performing
   * transactions, etc.).
   */
  readonly firestore: FirebaseFirestore;

  // This is the lite version of the Query class in the main SDK.
  constructor(
    firestore: FirebaseFirestore,
    readonly _converter: FirestoreDataConverter<T> | null,
    readonly _query: InternalQuery
  ) {
    this.firestore = firestore;
  }

  /**
   * Applies a custom data converter to this query, allowing you to use your own
   * custom model objects with Firestore. When you call {@link getDocs()} with
   * the returned query, the provided converter will convert between Firestore
   * data and your custom type `U`.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A `Query<U>` that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(this.firestore, converter, this._query);
  }
}

/** Describes the different query constraints available in this SDK. */
export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';

/**
 * A `QueryConstraint` is used to narrow the set of documents returned by a
 * Firestore query. `QueryConstraint`s are created by invoking {@link where()},
 * {@link orderBy()}, {@link startAt()}, {@link startAfter()}, {@link
 * endBefore()}, {@link endAt()}, {@link limit()} or {@link limitToLast()} and
 * can then be passed to {@link query()} to create a new query instance that
 * also contains this `QueryConstraint`.
 */
export abstract class QueryConstraint {
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
export function query<T>(
  query: Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T> {
  for (const constraint of queryConstraints) {
    query = constraint._apply(query);
  }
  return query;
}

class QueryFilterConstraint extends QueryConstraint {
  readonly type = 'where';

  constructor(
    private readonly _field: InternalFieldPath,
    private _op: Operator,
    private _value: unknown
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const reader = newUserDataReader(query.firestore);
    const filter = newQueryFilter(
      query._query,
      'where',
      reader,
      query.firestore._databaseId,
      this._field,
      this._op,
      this._value
    );
    return new Query(
      query.firestore,
      query._converter,
      queryWithAddedFilter(query._query, filter)
    );
  }
}

/**
 * Filter conditions in a {@link where()} clause are specified using the
 * strings '<', '<=', '==', '!=', '>=', '>', 'array-contains', 'in',
 * 'array-contains-any', and 'not-in'.
 */
export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';

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
export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint {
  const op = opStr as Operator;
  const field = fieldPathFromArgument('where', fieldPath);
  return new QueryFilterConstraint(field, op, value);
}

class QueryOrderByConstraint extends QueryConstraint {
  readonly type = 'orderBy';

  constructor(
    private readonly _field: InternalFieldPath,
    private _direction: Direction
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const orderBy = newQueryOrderBy(query._query, this._field, this._direction);
    return new Query(
      query.firestore,
      query._converter,
      queryWithAddedOrderBy(query._query, orderBy)
    );
  }
}

/**
 * The direction of a {@link orderBy()} clause is specified as 'desc' or 'asc'
 * (descending or ascending).
 */
export type OrderByDirection = 'desc' | 'asc';

/**
 * Creates a `QueryConstraint` that sorts the query result by the
 * specified field, optionally in descending order instead of ascending.
 *
 * @param fieldPath The field to sort by.
 * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
 * not specified, order will be ascending.
 * @return The created `Query`.
 */
export function orderBy(
  fieldPath: string | FieldPath,
  directionStr: OrderByDirection = 'asc'
): QueryConstraint {
  const direction = directionStr as Direction;
  const path = fieldPathFromArgument('orderBy', fieldPath);
  return new QueryOrderByConstraint(path, direction);
}

class QueryLimitConstraint extends QueryConstraint {
  constructor(
    readonly type: 'limit' | 'limitToLast',
    private readonly _limit: number,
    private readonly _limitType: LimitType
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    return new Query(
      query.firestore,
      query._converter,
      queryWithLimit(query._query, this._limit, this._limitType)
    );
  }
}

/**
 * Creates a `QueryConstraint` that only returns the first matching documents.
 *
 * @param limit The maximum number of items to return.
 * @return The created `Query`.
 */
export function limit(limit: number): QueryConstraint {
  validatePositiveNumber('limit', limit);
  return new QueryLimitConstraint('limit', limit, LimitType.First);
}

/**
 * Creates a `QueryConstraint` that only returns the last matching documents.
 *
 * You must specify at least one `orderBy` clause for `limitToLast` queries,
 * otherwise an exception will be thrown during execution.
 *
 * @param limit The maximum number of items to return.
 * @return The created `Query`.
 */
export function limitToLast(limit: number): QueryConstraint {
  validatePositiveNumber('limitToLast', limit);
  return new QueryLimitConstraint('limitToLast', limit, LimitType.Last);
}

class QueryStartAtConstraint extends QueryConstraint {
  constructor(
    readonly type: 'startAt' | 'startAfter',
    private readonly _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    private readonly _before: boolean
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const bound = newQueryBoundFromDocOrFields(
      query,
      this.type,
      this._docOrFields,
      this._before
    );
    return new Query(
      query.firestore,
      query._converter,
      queryWithStartAt(query._query, bound)
    );
  }
}

/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided document (inclusive). The starting position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * `orderBy` of this query.
 *
 * @param snapshot The snapshot of the document to start at.
 * @return A `QueryConstraint` to pass to `query()`.
 */
export function startAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query at, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`.
 */
export function startAt(...fieldValues: unknown[]): QueryConstraint;
export function startAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryStartAtConstraint('startAt', docOrFields, /*before=*/ true);
}

/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided document (exclusive). The starting position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to start after.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function startAfter(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query after, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function startAfter(...fieldValues: unknown[]): QueryConstraint;
export function startAfter(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryStartAtConstraint(
    'startAfter',
    docOrFields,
    /*before=*/ false
  );
}

class QueryEndAtConstraint extends QueryConstraint {
  constructor(
    readonly type: 'endBefore' | 'endAt',
    private readonly _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    private readonly _before: boolean
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const bound = newQueryBoundFromDocOrFields(
      query,
      this.type,
      this._docOrFields,
      this._before
    );
    return new Query(
      query.firestore,
      query._converter,
      queryWithEndAt(query._query, bound)
    );
  }
}

/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided document (exclusive). The end position is relative to the order of
 * the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to end before.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endBefore(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query before, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endBefore(...fieldValues: unknown[]): QueryConstraint;
export function endBefore(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryEndAtConstraint('endBefore', docOrFields, /*before=*/ true);
}

/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided document (inclusive). The end position is relative to the order of
 * the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to end at.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query at, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endAt(...fieldValues: unknown[]): QueryConstraint;
export function endAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryEndAtConstraint('endAt', docOrFields, /*before=*/ false);
}

/** Helper function to create a bound from a document or fields */
function newQueryBoundFromDocOrFields<T>(
  query: Query,
  methodName: string,
  docOrFields: Array<unknown | DocumentSnapshot<T>>,
  before: boolean
): Bound {
  if (docOrFields[0] instanceof DocumentSnapshot) {
    return newQueryBoundFromDocument(
      query._query,
      query.firestore._databaseId,
      methodName,
      docOrFields[0]._document,
      before
    );
  } else {
    const reader = newUserDataReader(query.firestore);
    return newQueryBoundFromFields(
      query._query,
      query.firestore._databaseId,
      reader,
      methodName,
      docOrFields,
      before
    );
  }
}

/**
 * A `CollectionReference` object can be used for adding documents, getting
 * document references, and querying for documents (using {@link query()}`).
 */
export class CollectionReference<T = DocumentData> extends Query<T> {
  readonly type = 'collection';

  constructor(
    readonly firestore: FirebaseFirestore,
    converter: FirestoreDataConverter<T> | null,
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
  get parent(): DocumentReference<DocumentData> | null {
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
   * Applies a custom data converter to this CollectionReference, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * addDoc()} with the returned `CollectionReference` instance, the provided
   * converter will convert between Firestore data and your custom type `U`.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A `CollectionReference<U>` that uses the provided converter.
   */
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, converter, this._path);
  }
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
export function collection(
  firestore: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
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
export function collection(
  reference: CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
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
export function collection(
  reference: DocumentReference,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData> {
  if (parent instanceof Compat) parent = parent._delegate;

  validateNonEmptyArgument('collection', 'path', path);
  if (parent instanceof FirebaseFirestore) {
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
    const absolutePath = ResourcePath.fromString(
      parent.path,
      ...pathSegments
    ).child(ResourcePath.fromString(path));
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
 * @param firestore A reference to the root Firestore instance.
 * @param collectionId Identifies the collections to query over. Every
 * collection or subcollection with this ID as the last segment of its path
 * will be included. Cannot contain a slash.
 * @return The created `Query`.
 */
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData> {
  firestore = cast(firestore, FirebaseFirestore);

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
export function doc(
  firestore: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
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
export function doc<T>(
  reference: CollectionReference<T>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<T>;
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
export function doc(
  reference: DocumentReference<unknown>,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference {
  if (parent instanceof Compat) parent = parent._delegate;

  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    path = AutoId.newId();
  }
  validateNonEmptyArgument('doc', 'path', path);

  if (parent instanceof FirebaseFirestore) {
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
    return new DocumentReference(
      parent.firestore,
      parent instanceof CollectionReference ? parent._converter : null,
      new DocumentKey(absolutePath)
    );
  }
}

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
export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  reference = cast<DocumentReference<T>>(reference, DocumentReference);
  const datastore = getDatastore(reference.firestore);
  return invokeBatchGetDocumentsRpc(datastore, [reference._key]).then(
    result => {
      hardAssert(result.length === 1, 'Expected a single document result');
      const maybeDocument = result[0];
      return new DocumentSnapshot<T>(
        reference.firestore,
        reference._key,
        maybeDocument instanceof Document ? maybeDocument : null,
        reference._converter
      );
    }
  );
}

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
export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
  query = cast<Query<T>>(query, Query);
  validateHasExplicitOrderByForLimitToLast(query._query);

  const datastore = getDatastore(query.firestore);
  return invokeRunQueryRpc(datastore, query._query).then(result => {
    const docs = result.map(
      doc =>
        new QueryDocumentSnapshot<T>(
          query.firestore,
          doc.key,
          doc,
          query._converter
        )
    );

    if (hasLimitToLast(query._query)) {
      // Limit to last queries reverse the orderBy constraint that was
      // specified by the user. As such, we need to reverse the order of the
      // results to return the documents in the expected order.
      docs.reverse();
    }

    return new QuerySnapshot<T>(query, docs);
  });
}

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
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
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
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void> {
  reference = cast<DocumentReference<T>>(reference, DocumentReference);
  const convertedValue = applyFirestoreDataConverter(
    reference._converter,
    data,
    options
  );
  const dataReader = newUserDataReader(reference.firestore);
  const parsed = parseSetData(
    dataReader,
    'setDoc',
    reference._key,
    convertedValue,
    reference._converter !== null,
    options
  );

  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(
    datastore,
    parsed.toMutations(reference._key, Precondition.none())
  );
}

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
export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
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
export function updateDoc(
  reference: DocumentReference<unknown>,
  field: string | FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  fieldOrUpdateData: string | FieldPath | UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  reference = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const dataReader = newUserDataReader(reference.firestore);

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof FieldPath
  ) {
    parsed = parseUpdateVarargs(
      dataReader,
      'updateDoc',
      reference._key,
      fieldOrUpdateData,
      value,
      moreFieldsAndValues
    );
  } else {
    parsed = parseUpdateData(
      dataReader,
      'updateDoc',
      reference._key,
      fieldOrUpdateData
    );
  }

  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(
    datastore,
    parsed.toMutations(reference._key, Precondition.exists(true))
  );
}

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
export function deleteDoc(
  reference: DocumentReference<unknown>
): Promise<void> {
  reference = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(datastore, [
    new DeleteMutation(reference._key, Precondition.none())
  ]);
}

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
export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  reference = cast<CollectionReference<T>>(reference, CollectionReference);
  const docRef = doc(reference);

  const convertedValue = applyFirestoreDataConverter(
    reference._converter,
    data
  );

  const dataReader = newUserDataReader(reference.firestore);
  const parsed = parseSetData(
    dataReader,
    'addDoc',
    docRef._key,
    convertedValue,
    docRef._converter !== null,
    {}
  );

  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(
    datastore,
    parsed.toMutations(docRef._key, Precondition.exists(false))
  ).then(() => docRef);
}

/**
 * Returns true if the provided references are equal.
 *
 * @param left A reference to compare.
 * @param right A reference to compare.
 * @return true if the references point to the same location in the same
 * Firestore database.
 */
export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean {
  if (left instanceof Compat) left = left._delegate;
  if (right instanceof Compat) right = right._delegate;

  if (
    (left instanceof DocumentReference ||
      left instanceof CollectionReference) &&
    (right instanceof DocumentReference || right instanceof CollectionReference)
  ) {
    return (
      left.firestore === right.firestore &&
      left.path === right.path &&
      left._converter === right._converter
    );
  }
  return false;
}

/**
 * Returns true if the provided queries point to the same collection and apply
 * the same constraints.
 *
 * @param left A `Query` to compare.
 * @param right A Query` to compare.
 * @return true if the references point to the same location in the same
 * Firestore database.
 */
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean {
  if (left instanceof Compat) left = left._delegate;
  if (right instanceof Compat) right = right._delegate;

  if (left instanceof Query && right instanceof Query) {
    return (
      left.firestore === right.firestore &&
      queryEquals(left._query, right._query) &&
      left._converter === right._converter
    );
  }
  return false;
}

export function newUserDataReader(
  firestore: FirebaseFirestore
): UserDataReader {
  const settings = firestore._freezeSettings();
  const serializer = newSerializer(firestore._databaseId);
  return new UserDataReader(
    firestore._databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}

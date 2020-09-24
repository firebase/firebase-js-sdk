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
  _DocumentKeyReference,
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
  validateCollectionPath,
  validateDocumentPath,
  validateExactNumberOfArgs,
  validatePositiveNumber
} from '../../../src/util/input_validation';
import { newSerializer } from '../../../src/platform/serializer';
import { Code, FirestoreError } from '../../../src/util/error';
import { getDatastore } from './components';

/**
 * Document data (for use with `DocumentReference.set()`) consists of fields
 * mapped to values.
 */
export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

/**
 * Update data (for use with `DocumentReference.update()`) consists of field
 * paths (e.g. 'foo' or 'foo.baz') mapped to values. Fields that contain dots
 * reference nested fields within the document.
 */
export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [fieldPath: string]: any;
}

/**
 * An options object that configures the behavior of `set()` calls in
 * {@link firebase.firestore.DocumentReference.set DocumentReference}, {@link
 * firebase.firestore.WriteBatch.set WriteBatch} and {@link
 * firebase.firestore.Transaction.set Transaction}. These calls can be
 * configured to perform granular merges instead of overwriting the target
 * documents in their entirety by providing a `SetOptions` with `merge: true`.
 */
export type SetOptions =
  | {
      /**
       * Changes the behavior of a set() call to only replace the values specified
       * in its data argument. Fields omitted from the set() call remain
       * untouched.
       */
      readonly merge?: boolean;
    }
  | {
      /**
       * Changes the behavior of set() calls to only replace the specified field
       * paths. Any field path that is not specified is ignored and remains
       * untouched.
       */
      readonly mergeFields?: Array<string | FieldPath>;
    };

/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist. A `DocumentReference` can
 * also be used to create a `CollectionReference` to a subcollection.
 */
export class DocumentReference<T = DocumentData> extends _DocumentKeyReference<
  T
> {
  readonly type = 'document';

  /**
   * The {@link firebase.firestore.Firestore} the document is in.
   * This is useful for performing transactions, for example.
   */
  readonly firestore: FirebaseFirestore;

  constructor(
    firestore: FirebaseFirestore,
    _converter: FirestoreDataConverter<T> | null,
    readonly _path: ResourcePath
  ) {
    super(firestore._databaseId, new DocumentKey(_path), _converter);
    this.firestore = firestore;
  }

  /**
   * The document's identifier within its collection.
   */
  get id(): string {
    return this._path.lastSegment();
  }

  /**
   * A string representing the path of the referenced document (relative
   * to the root of the database).
   */
  get path(): string {
    return this._path.canonicalString();
  }

  /**
   * The Collection this `DocumentReference` belongs to.
   */
  get parent(): CollectionReference<T> {
    return new CollectionReference<T>(
      this.firestore,
      this._converter,
      this._key.path.popLast()
    );
  }

  /**
   * Applies a custom data converter to this DocumentReference, allowing you
   * to use your own custom model objects with Firestore. When you call
   * set(), get(), etc. on the returned DocumentReference instance, the
   * provided converter will convert between Firestore data and your custom
   * type U.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A DocumentReference<U> that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, converter, this._path);
  }
}

/**
 * A `Query` refers to a Query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export class Query<T = DocumentData> {
  readonly type: 'query' | 'collection' = 'query';

  /**
   * The `Firestore` for the Firestore database (useful for performing
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
   * Applies a custom data converter to this Query, allowing you to use your
   * own custom model objects with Firestore. When you call get() on the
   * returned Query, the provided converter will convert between Firestore
   * data and your custom type U.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A Query<U> that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(this.firestore, converter, this._query);
  }
}

export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';

export abstract class QueryConstraint {
  abstract readonly type: QueryConstraintType;

  /**
   * Takes the provided Query and returns a copy of the Query with this
   * QueryConstraint applied.
   */
  abstract _apply<T>(query: Query<T>): Query<T>;
}

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
 * Filter conditions in a `Query.where()` clause are specified using the
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
 * Creates and returns a new Query with the additional filter that documents
 * must contain the specified field and the value should satisfy the
 * relation constraint provided.
 *
 * @param fieldPath The path to compare
 * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
 * @param value The value for comparison
 * @return The created Query.
 */
export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint {
  // TODO(firestorelite): Consider validating the enum strings (note that
  // TypeScript does not support passing invalid values).
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
 * The direction of a `Query.orderBy()` clause is specified as 'desc' or 'asc'
 * (descending or ascending).
 */
export type OrderByDirection = 'desc' | 'asc';

/**
 * Creates and returns a new Query that's additionally sorted by the
 * specified field, optionally in descending order instead of ascending.
 *
 * @param fieldPath The field to sort by.
 * @param directionStr Optional direction to sort by (`asc` or `desc`). If
 * not specified, order will be ascending.
 * @return The created Query.
 */
export function orderBy(
  field: string | FieldPath,
  directionStr: OrderByDirection = 'asc'
): QueryConstraint {
  // TODO(firestorelite): Consider validating the enum strings (note that
  // TypeScript does not support passing invalid values).
  const direction = directionStr as Direction;
  const fieldPath = fieldPathFromArgument('orderBy', field);
  return new QueryOrderByConstraint(fieldPath, direction);
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
 * Creates and returns a new Query that only returns the first matching
 * documents.
 *
 * @param limit The maximum number of items to return.
 * @return The created Query.
 */
export function limit(n: number): QueryConstraint {
  validatePositiveNumber('limit', 1, n);
  return new QueryLimitConstraint('limit', n, LimitType.First);
}

/**
 * Creates and returns a new Query that only returns the last matching
 * documents.
 *
 * You must specify at least one `orderBy` clause for `limitToLast` queries,
 * otherwise an exception will be thrown during execution.
 *
 * @param limit The maximum number of items to return.
 * @return The created Query.
 */
export function limitToLast(n: number): QueryConstraint {
  validatePositiveNumber('limitToLast', 1, n);
  return new QueryLimitConstraint('limitToLast', n, LimitType.Last);
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
 * Creates and returns a new Query that starts at the provided document
 * (inclusive). The starting position is relative to the order of the query.
 * The document must contain all of the fields provided in the `orderBy` of
 * this query.
 *
 * @param snapshot The snapshot of the document to start at.
 * @return The created Query.
 */
export function startAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates and returns a new Query that starts at the provided fields
 * relative to the order of the query. The order of the field values
 * must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query at, in order
 * of the query's order by.
 * @return The created Query.
 */
export function startAt(...fieldValues: unknown[]): QueryConstraint;
export function startAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryStartAtConstraint('startAt', docOrFields, /*before=*/ true);
}

/**
 * Creates and returns a new Query that starts after the provided document
 * (exclusive). The starting position is relative to the order of the query.
 * The document must contain all of the fields provided in the orderBy of
 * this query.
 *
 * @param snapshot The snapshot of the document to start after.
 * @return The created Query.
 */
export function startAfter(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
/**
 * Creates and returns a new Query that starts after the provided fields
 * relative to the order of the query. The order of the field values
 * must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query after, in order
 * of the query's order by.
 * @return The created Query.
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
 * Creates and returns a new Query that ends before the provided document
 * (exclusive). The end position is relative to the order of the query. The
 * document must contain all of the fields provided in the orderBy of this
 * query.
 *
 * @param snapshot The snapshot of the document to end before.
 * @return The created Query.
 */
export function endBefore(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates and returns a new Query that ends before the provided fields
 * relative to the order of the query. The order of the field values
 * must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query before, in order
 * of the query's order by.
 * @return The created Query.
 */
export function endBefore(...fieldValues: unknown[]): QueryConstraint;
export function endBefore(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryEndAtConstraint('endBefore', docOrFields, /*before=*/ true);
}

/**
 * Creates and returns a new Query that ends at the provided document
 * (inclusive). The end position is relative to the order of the query. The
 * document must contain all of the fields provided in the orderBy of this
 * query.
 *
 * @param snapshot The snapshot of the document to end at.
 * @return The created Query.
 */
export function endAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates and returns a new Query that ends at the provided fields
 * relative to the order of the query. The order of the field values
 * must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query at, in order
 * of the query's order by.
 * @return The created Query.
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
    validateExactNumberOfArgs(methodName, docOrFields, 1);
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
 * document references, and querying for documents (using the methods
 * inherited from `Query`).
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
   * A reference to the containing `DocumentReference` if this is a subcollection.
   * If this isn't a subcollection, the reference is null.
   */
  get parent(): DocumentReference<DocumentData> | null {
    const parentPath = this._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        this.firestore,
        /* converter= */ null,
        parentPath
      );
    }
  }

  /**
   * Applies a custom data converter to this CollectionReference, allowing you
   * to use your own custom model objects with Firestore. When you call add()
   * on the returned CollectionReference instance, the provided converter will
   * convert between Firestore data and your custom type U.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A CollectionReference<U> that uses the provided converter.
   */
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, converter, this._path);
  }
}

/**
 * Gets a `CollectionReference` instance that refers to the collection at
 * the specified path.
 *
 * @param collectionPath A slash-separated path to a collection.
 * @return The `CollectionReference` instance.
 */
export function collection(
  firestore: FirebaseFirestore,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData>;
export function collection(
  reference: CollectionReference<unknown>,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData>;
export function collection(
  reference: DocumentReference,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  path: string,
  ...pathComponents: string[]
): CollectionReference<DocumentData> {
  validateNonEmptyArgument('collection', 'path', path);
  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathComponents);
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
      ...pathComponents
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
 * Creates and returns a new Query that includes all documents in the
 * database that are contained in a collection or subcollection with the
 * given collectionId.
 *
 * @param collectionId Identifies the collections to query over. Every
 * collection or subcollection with this ID as the last segment of its path
 * will be included. Cannot contain a slash.
 * @return The created Query.
 */
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData> {
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
 * specified path.
 *
 * @param documentPath A slash-separated path to a document.
 * @return The `DocumentReference` instance.
 */
export function doc(
  firestore: FirebaseFirestore,
  path: string,
  ...pathComponents: string[]
): DocumentReference<DocumentData>;
export function doc<T>(
  reference: CollectionReference<T>,
  path?: string,
  ...pathComponents: string[]
): DocumentReference<T>;
export function doc(
  reference: DocumentReference<unknown>,
  path: string,
  ...pathComponents: string[]
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  path?: string,
  ...pathComponents: string[]
): DocumentReference {
  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    path = AutoId.newId();
  }
  validateNonEmptyArgument('doc', 'path', path);

  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathComponents);
    validateDocumentPath(absolutePath);
    return new DocumentReference(parent, /* converter= */ null, absolutePath);
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
      ResourcePath.fromString(path, ...pathComponents)
    );
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent.firestore,
      parent instanceof CollectionReference ? parent._converter : null,
      absolutePath
    );
  }
}

export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
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

export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
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

export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
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

export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
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

export function deleteDoc(reference: DocumentReference): Promise<void> {
  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(datastore, [
    new DeleteMutation(reference._key, Precondition.none())
  ]);
}

export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
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

export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean {
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
 * Returns true if this `Query` is equal to the provided one.
 *
 * @param other The `Query` to compare against.
 * @return true if this `Query` is equal to the provided one.
 */
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean {
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
  const settings = firestore._getSettings();
  const serializer = newSerializer(firestore._databaseId);
  return new UserDataReader(
    firestore._databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}

function validateNonEmptyArgument(
  functionName: string,
  argumentName: string,
  argument?: string
): asserts argument is string {
  if (!argument) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() cannot be called with an empty ${argumentName}.`
    );
  }
}

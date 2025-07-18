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

import { loadBundle, namedQuery } from '../api/database';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver
} from '../api/observer';
import { ListenerDataSource } from '../core/event_manager';
import {
  firestoreClientAddSnapshotsInSyncListener,
  firestoreClientGetDocumentFromLocalCache,
  firestoreClientGetDocumentsFromLocalCache,
  firestoreClientGetDocumentsViaSnapshotListener,
  firestoreClientGetDocumentViaSnapshotListener,
  firestoreClientListen,
  firestoreClientWrite
} from '../core/firestore_client';
import { newQueryForPath, Query as InternalQuery } from '../core/query';
import { ViewSnapshot } from '../core/view_snapshot';
import { Bytes } from '../lite-api/bytes';
import { FieldPath } from '../lite-api/field_path';
import { validateHasExplicitOrderByForLimitToLast } from '../lite-api/query';
import {
  CollectionReference,
  doc,
  DocumentData,
  DocumentReference,
  PartialWithFieldValue,
  Query,
  SetOptions,
  UpdateData,
  WithFieldValue
} from '../lite-api/reference';
import { applyFirestoreDataConverter } from '../lite-api/reference_impl';
import {
  newUserDataReader,
  ParsedUpdateData,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs
} from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { DocumentKey } from '../model/document_key';
import { DeleteMutation, Mutation, Precondition } from '../model/mutation';
import { debugAssert } from '../util/assert';
import { ByteString } from '../util/byte_string';
import { Code, FirestoreError } from '../util/error';
import { cast } from '../util/input_validation';

import { ensureFirestoreConfigured, Firestore } from './database';
import {
  DocumentSnapshot,
  FirestoreDataConverter,
  QuerySnapshot,
  SnapshotMetadata
} from './snapshot';

/**
 * An options object that can be passed to {@link (onSnapshot:1)} and {@link
 * QuerySnapshot.docChanges} to control which types of changes to include in the
 * result set.
 */
export interface SnapshotListenOptions {
  /**
   * Include a change even if only the metadata of the query or of a document
   * changed. Default is false.
   */
  readonly includeMetadataChanges?: boolean;

  /**
   * Set the source the query listens to. Default to "default", which
   * listens to both cache and server.
   */
  readonly source?: ListenSource;
}

/**
 * Describe the source a query listens to.
 *
 * Set to `default` to listen to both cache and server changes. Set to `cache`
 * to listen to changes in cache only.
 */
export type ListenSource = 'default' | 'cache';

/**
 * Reads the document referred to by this `DocumentReference`.
 *
 * Note: `getDoc()` attempts to provide up-to-date data when possible by waiting
 * for data from the server, but it may return cached data or fail if you are
 * offline and the server cannot be reached. To specify this behavior, invoke
 * {@link getDocFromCache} or {@link getDocFromServer}.
 *
 * @param reference - The reference of the document to fetch.
 * @returns A Promise resolved with a `DocumentSnapshot` containing the
 * current document contents.
 */
export function getDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
  reference = cast<DocumentReference<AppModelType, DbModelType>>(
    reference,
    DocumentReference
  );
  const firestore = cast(reference.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);

  return firestoreClientGetDocumentViaSnapshotListener(
    client,
    reference._key
  ).then(snapshot => convertToDocSnapshot(firestore, reference, snapshot));
}

export class ExpUserDataWriter extends AbstractUserDataWriter {
  constructor(protected firestore: Firestore) {
    super();
  }

  protected convertBytes(bytes: ByteString): Bytes {
    return new Bytes(bytes);
  }

  protected convertReference(name: string): DocumentReference {
    const key = this.convertDocumentKey(name, this.firestore._databaseId);
    return new DocumentReference(this.firestore, /* converter= */ null, key);
  }
}

/**
 * Reads the document referred to by this `DocumentReference` from cache.
 * Returns an error if the document is not currently cached.
 *
 * @returns A `Promise` resolved with a `DocumentSnapshot` containing the
 * current document contents.
 */
export function getDocFromCache<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
  reference = cast<DocumentReference<AppModelType, DbModelType>>(
    reference,
    DocumentReference
  );
  const firestore = cast(reference.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  return firestoreClientGetDocumentFromLocalCache(client, reference._key).then(
    doc =>
      new DocumentSnapshot<AppModelType, DbModelType>(
        firestore,
        userDataWriter,
        reference._key,
        doc,
        new SnapshotMetadata(
          doc !== null && doc.hasLocalMutations,
          /* fromCache= */ true
        ),
        reference.converter
      )
  );
}

/**
 * Reads the document referred to by this `DocumentReference` from the server.
 * Returns an error if the network is not available.
 *
 * @returns A `Promise` resolved with a `DocumentSnapshot` containing the
 * current document contents.
 */
export function getDocFromServer<
  AppModelType,
  DbModelType extends DocumentData
>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
  reference = cast<DocumentReference<AppModelType, DbModelType>>(
    reference,
    DocumentReference
  );
  const firestore = cast(reference.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);

  return firestoreClientGetDocumentViaSnapshotListener(client, reference._key, {
    source: 'server'
  }).then(snapshot => convertToDocSnapshot(firestore, reference, snapshot));
}

/**
 * Executes the query and returns the results as a `QuerySnapshot`.
 *
 * Note: `getDocs()` attempts to provide up-to-date data when possible by
 * waiting for data from the server, but it may return cached data or fail if
 * you are offline and the server cannot be reached. To specify this behavior,
 * invoke {@link getDocsFromCache} or {@link getDocsFromServer}.
 *
 * @returns A `Promise` that will be resolved with the results of the query.
 */
export function getDocs<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>
): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  query = cast<Query<AppModelType, DbModelType>>(query, Query);
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  validateHasExplicitOrderByForLimitToLast(query._query);
  return firestoreClientGetDocumentsViaSnapshotListener(
    client,
    query._query
  ).then(
    snapshot =>
      new QuerySnapshot<AppModelType, DbModelType>(
        firestore,
        userDataWriter,
        query,
        snapshot
      )
  );
}

/**
 * Executes the query and returns the results as a `QuerySnapshot` from cache.
 * Returns an empty result set if no documents matching the query are currently
 * cached.
 *
 * @returns A `Promise` that will be resolved with the results of the query.
 */
export function getDocsFromCache<
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>
): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  query = cast<Query<AppModelType, DbModelType>>(query, Query);
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  return firestoreClientGetDocumentsFromLocalCache(client, query._query).then(
    snapshot =>
      new QuerySnapshot<AppModelType, DbModelType>(
        firestore,
        userDataWriter,
        query,
        snapshot
      )
  );
}

/**
 * Executes the query and returns the results as a `QuerySnapshot` from the
 * server. Returns an error if the network is not available.
 *
 * @returns A `Promise` that will be resolved with the results of the query.
 */
export function getDocsFromServer<
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>
): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  query = cast<Query<AppModelType, DbModelType>>(query, Query);
  const firestore = cast(query.firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  return firestoreClientGetDocumentsViaSnapshotListener(client, query._query, {
    source: 'server'
  }).then(
    snapshot => new QuerySnapshot(firestore, userDataWriter, query, snapshot)
  );
}

/**
 * Writes to the document referred to by this `DocumentReference`. If the
 * document does not yet exist, it will be created.
 *
 * @param reference - A reference to the document to write.
 * @param data - A map of the fields and values for the document.
 * @returns A `Promise` resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
 */
export function setDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: WithFieldValue<AppModelType>
): Promise<void>;
/**
 * Writes to the document referred to by the specified `DocumentReference`. If
 * the document does not yet exist, it will be created. If you provide `merge`
 * or `mergeFields`, the provided data can be merged into an existing document.
 *
 * @param reference - A reference to the document to write.
 * @param data - A map of the fields and values for the document.
 * @param options - An object to configure the set behavior.
 * @returns A Promise resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
 */
export function setDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: PartialWithFieldValue<AppModelType>,
  options: SetOptions
): Promise<void>;
export function setDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: PartialWithFieldValue<AppModelType>,
  options?: SetOptions
): Promise<void> {
  reference = cast<DocumentReference<AppModelType, DbModelType>>(
    reference,
    DocumentReference
  );
  const firestore = cast(reference.firestore, Firestore);

  const convertedValue = applyFirestoreDataConverter(
    reference.converter,
    data as WithFieldValue<AppModelType>,
    options
  );
  const dataReader = newUserDataReader(firestore);
  const parsed = parseSetData(
    dataReader,
    'setDoc',
    reference._key,
    convertedValue,
    reference.converter !== null,
    options
  );

  const mutation = parsed.toMutation(reference._key, Precondition.none());
  return executeWrite(firestore, [mutation]);
}

/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference`. The update will fail if applied to a document that does
 * not exist.
 *
 * @param reference - A reference to the document to update.
 * @param data - An object containing the fields and values with which to
 * update the document. Fields can contain dots to reference nested fields
 * within the document.
 * @returns A `Promise` resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
 */
export function updateDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: UpdateData<DbModelType>
): Promise<void>;
/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference` The update will fail if applied to a document that does
 * not exist.
 *
 * Nested fields can be updated by providing dot-separated field path
 * strings or by providing `FieldPath` objects.
 *
 * @param reference - A reference to the document to update.
 * @param field - The first field to update.
 * @param value - The first value.
 * @param moreFieldsAndValues - Additional key value pairs.
 * @returns A `Promise` resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
 */
export function updateDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  field: string | FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<unknown>,
  fieldOrUpdateData: string | FieldPath | UpdateData<DbModelType>,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  reference = cast<DocumentReference<AppModelType, DbModelType>>(
    reference,
    DocumentReference
  );
  const firestore = cast(reference.firestore, Firestore);

  const dataReader = newUserDataReader(firestore);

  // For Compat types, we have to "extract" the underlying types before
  // performing validation.
  fieldOrUpdateData = getModularInstance(fieldOrUpdateData);

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

  const mutation = parsed.toMutation(reference._key, Precondition.exists(true));
  return executeWrite(firestore, [mutation]);
}

/**
 * Deletes the document referred to by the specified `DocumentReference`.
 *
 * @param reference - A reference to the document to delete.
 * @returns A Promise resolved once the document has been successfully
 * deleted from the backend (note that it won't resolve while you're offline).
 */
export function deleteDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<void> {
  const firestore = cast(reference.firestore, Firestore);
  const mutations = [new DeleteMutation(reference._key, Precondition.none())];
  return executeWrite(firestore, mutations);
}

/**
 * Add a new document to specified `CollectionReference` with the given data,
 * assigning it a document ID automatically.
 *
 * @param reference - A reference to the collection to add this document to.
 * @param data - An Object containing the data for the new document.
 * @returns A `Promise` resolved with a `DocumentReference` pointing to the
 * newly created document after it has been written to the backend (Note that it
 * won't resolve while you're offline).
 */
export function addDoc<AppModelType, DbModelType extends DocumentData>(
  reference: CollectionReference<AppModelType, DbModelType>,
  data: WithFieldValue<AppModelType>
): Promise<DocumentReference<AppModelType, DbModelType>> {
  const firestore = cast(reference.firestore, Firestore);

  const docRef = doc(reference);
  const convertedValue = applyFirestoreDataConverter(reference.converter, data);

  const dataReader = newUserDataReader(reference.firestore);
  const parsed = parseSetData(
    dataReader,
    'addDoc',
    docRef._key,
    convertedValue,
    reference.converter !== null,
    {}
  );

  const mutation = parsed.toMutation(docRef._key, Precondition.exists(false));
  return executeWrite(firestore, [mutation]).then(() => docRef);
}

/**
 * A function returned by `onSnapshot()` that removes the listener when invoked.
 */
export interface Unsubscribe {
  /** Removes the listener when invoked. */
  (): void;
}

// TODO(firestorexp): Make sure these overloads are tested via the Firestore
// integration tests

/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param reference - A reference to the document to listen to.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  observer: {
    next?: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param reference - A reference to the document to listen to.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param reference - A reference to the document to listen to.
 * @param onNext - A callback to be called every time a new `DocumentSnapshot` is available.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  onNext: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param reference - A reference to the document to listen to.
 * @param options - Options controlling the listen behavior.
 * @param onNext - A callback to be called every time a new `DocumentSnapshot` is available.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks. The
 * listener can be cancelled by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param query - The query to listen to.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  observer: {
    next?: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks. The
 * listener can be cancelled by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param query - The query to listen to.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks. The
 * listener can be cancelled by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param query - The query to listen to.
 * @param onNext - A callback to be called every time a new `QuerySnapshot` is available.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  onNext: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass individual `onNext` and
 * `onError` callbacks or pass a single observer object with `next` and `error` callbacks. The
 * listener can be cancelled by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param query - The query to listen to.
 * @param options - Options controlling the listen behavior.
 * @param onNext - A callback to be called every time a new `QuerySnapshot` is available.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<AppModelType, DbModelType extends DocumentData>(
  reference:
    | Query<AppModelType, DbModelType>
    | DocumentReference<AppModelType, DbModelType>,
  ...args: unknown[]
): Unsubscribe {
  // onSnapshot for Query or Document.
  reference = getModularInstance(reference);
  let options: SnapshotListenOptions = {
    includeMetadataChanges: false,
    source: 'default'
  };
  let currArg = 0;
  if (typeof args[currArg] === 'object' && !isPartialObserver(args[currArg])) {
    options = args[currArg++] as SnapshotListenOptions;
  }

  const internalOptions = {
    includeMetadataChanges: options.includeMetadataChanges,
    source: options.source as ListenerDataSource
  };

  if (isPartialObserver(args[currArg])) {
    const userObserver = args[currArg] as PartialObserver<
      QuerySnapshot<AppModelType, DbModelType>
    >;
    args[currArg] = userObserver.next?.bind(userObserver);
    args[currArg + 1] = userObserver.error?.bind(userObserver);
    args[currArg + 2] = userObserver.complete?.bind(userObserver);
  }

  let observer: PartialObserver<ViewSnapshot>;
  let firestore: Firestore;
  let internalQuery: InternalQuery;

  if (reference instanceof DocumentReference) {
    firestore = cast(reference.firestore, Firestore);
    internalQuery = newQueryForPath(reference._key.path);

    observer = {
      next: snapshot => {
        if (args[currArg]) {
          (
            args[currArg] as NextFn<DocumentSnapshot<AppModelType, DbModelType>>
          )(
            convertToDocSnapshot(
              firestore,
              reference as DocumentReference<AppModelType, DbModelType>,
              snapshot
            )
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };
  } else {
    const query = cast<Query<AppModelType, DbModelType>>(reference, Query);
    firestore = cast(query.firestore, Firestore);
    internalQuery = query._query;
    const userDataWriter = new ExpUserDataWriter(firestore);
    observer = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<QuerySnapshot<AppModelType, DbModelType>>)(
            new QuerySnapshot(firestore, userDataWriter, query, snapshot)
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };

    validateHasExplicitOrderByForLimitToLast(reference._query);
  }

  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientListen(
    client,
    internalQuery,
    internalOptions,
    observer
  );
}

/**
 * Attaches a listener for `QuerySnapshot` events based on data generated by invoking
 * {@link QuerySnapshot.toJSON} You may either pass individual `onNext` and `onError` callbacks or
 * pass a single observer object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link QuerySnapshot.toJSON}.
 * @param onNext - A callback to be called every time a new `QuerySnapshot` is available.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  onNext: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void,
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events based on data generated by invoking
 * {@link DocumentSnapshot.toJSON}. You may either pass individual `onNext` and `onError` callbacks or
 * pass a single observer object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link DocumentSnapshot.toJSON}.
 * @param onNext - A callback to be called every time a new `DocumentSnapshot` is available.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @param onCompletion - Can be provided, but will not be called since streams are
 * never ending.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  onNext: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void,
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events based on data generated by invoking
 * {@link QuerySnapshot.toJSON}. You may either pass individual `onNext` and `onError` callbacks or
 * pass a single observer object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link QuerySnapshot.toJSON}.
 * @param options - Options controlling the listen behavior.
 * @param onNext - A callback to be called every time a new `QuerySnapshot` is available.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void,
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events based on data generated by invoking
 * {@link DocumentSnapshot.toJSON}. You may either pass individual `onNext` and `onError` callbacks
 * or pass a single observer object with `next` and `error` callbacks. The listener can be cancelled
 * by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link DocumentSnapshot.toJSON}.
 * @param options - Options controlling the listen behavior.
 * @param onNext - A callback to be called every time a new `DocumentSnapshot` is available.
 * @param onError - A callback to be called if the listen fails or is cancelled. No further
 * callbacks will occur.
 * @param onCompletion - Can be provided, but will not be called since streams are never ending.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void,
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events based on QuerySnapshot data generated by invoking
 * {@link QuerySnapshot.toJSON}. You may either pass individual `onNext` and `onError` callbacks or
 * pass a single observer object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link QuerySnapshot.toJSON}.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  observer: {
    next: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  },
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events based on data generated by invoking
 * {@link DocumentSnapshot.toJSON} You may either pass individual `onNext` and `onError` callbacks
 * or pass a single observer object with `next` and `error` callbacks. The listener can be cancelled
 * by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link DocumentSnapshot.toJSON}.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  observer: {
    next: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  },
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events based on QuerySnapshot data generated by invoking
 * {@link QuerySnapshot.toJSON} You may either pass individual `onNext` and `onError` callbacks or
 * pass a single observer object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link QuerySnapshot.toJSON}.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  options: SnapshotListenOptions,
  observer: {
    next: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  },
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events based on QuerySnapshot data generated by
 * invoking {@link DocumentSnapshot.toJSON} You may either pass individual `onNext` and `onError`
 * callbacks or pass a single observer object with `next` and `error` callbacks. The listener can be
 * cancelled by calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will never be called because the
 * snapshot stream is never-ending.
 *
 * @param firestore - The {@link Firestore} instance to enable the listener for.
 * @param snapshotJson - A JSON object generated by invoking {@link DocumentSnapshot.toJSON}.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel the snapshot listener.
 */
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(
  firestore: Firestore,
  snapshotJson: object,
  options: SnapshotListenOptions,
  observer: {
    next: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  },
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe;
export function onSnapshotResume<
  AppModelType,
  DbModelType extends DocumentData
>(reference: Firestore, snapshotJson: object, ...args: unknown[]): Unsubscribe {
  const db = getModularInstance(reference);
  const json = normalizeSnapshotJsonFields(snapshotJson);
  if (json.error) {
    throw new FirestoreError(Code.INVALID_ARGUMENT, json.error);
  }
  let curArg = 0;
  let options: SnapshotListenOptions | undefined = undefined;
  if (typeof args[curArg] === 'object' && !isPartialObserver(args[curArg])) {
    options = args[curArg++] as SnapshotListenOptions;
  }

  if (json.bundleSource === 'QuerySnapshot') {
    let observer: {
      next: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
      error?: (error: FirestoreError) => void;
      complete?: () => void;
    } | null = null;
    if (typeof args[curArg] === 'object' && isPartialObserver(args[curArg])) {
      const userObserver = args[curArg++] as PartialObserver<
        QuerySnapshot<AppModelType, DbModelType>
      >;
      observer = {
        next: userObserver.next!,
        error: userObserver.error,
        complete: userObserver.complete
      };
    } else {
      observer = {
        next: args[curArg++] as (
          snapshot: QuerySnapshot<AppModelType, DbModelType>
        ) => void,
        error: args[curArg++] as (error: FirestoreError) => void,
        complete: args[curArg++] as () => void
      };
    }
    return onSnapshotQuerySnapshotBundle(
      db,
      json,
      options,
      observer!,
      args[curArg] as FirestoreDataConverter<DbModelType>
    );
  } else if (json.bundleSource === 'DocumentSnapshot') {
    let observer: {
      next: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
      error?: (error: FirestoreError) => void;
      complete?: () => void;
    } | null = null;
    if (typeof args[curArg] === 'object' && isPartialObserver(args[curArg])) {
      const userObserver = args[curArg++] as PartialObserver<
        DocumentSnapshot<AppModelType, DbModelType>
      >;
      observer = {
        next: userObserver.next!,
        error: userObserver.error,
        complete: userObserver.complete
      };
    } else {
      observer = {
        next: args[curArg++] as (
          snapshot: DocumentSnapshot<AppModelType, DbModelType>
        ) => void,
        error: args[curArg++] as (error: FirestoreError) => void,
        complete: args[curArg++] as () => void
      };
    }
    return onSnapshotDocumentSnapshotBundle(
      db,
      json,
      options,
      observer!,
      args[curArg] as FirestoreDataConverter<DbModelType>
    );
  } else {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `unsupported bundle source: ${json.bundleSource}`
    );
  }
}

// TODO(firestorexp): Make sure these overloads are tested via the Firestore
// integration tests

/**
 * Attaches a listener for a snapshots-in-sync event. The snapshots-in-sync
 * event indicates that all listeners affected by a given change have fired,
 * even if a single server-generated change affects multiple listeners.
 *
 * NOTE: The snapshots-in-sync event only indicates that listeners are in sync
 * with each other, but does not relate to whether those snapshots are in sync
 * with the server. Use SnapshotMetadata in the individual listeners to
 * determine if a snapshot is from the cache or the server.
 *
 * @param firestore - The instance of Firestore for synchronizing snapshots.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @returns An unsubscribe function that can be called to cancel the snapshot
 * listener.
 */
export function onSnapshotsInSync(
  firestore: Firestore,
  observer: {
    next?: (value: void) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for a snapshots-in-sync event. The snapshots-in-sync
 * event indicates that all listeners affected by a given change have fired,
 * even if a single server-generated change affects multiple listeners.
 *
 * NOTE: The snapshots-in-sync event only indicates that listeners are in sync
 * with each other, but does not relate to whether those snapshots are in sync
 * with the server. Use `SnapshotMetadata` in the individual listeners to
 * determine if a snapshot is from the cache or the server.
 *
 * @param firestore - The `Firestore` instance for synchronizing snapshots.
 * @param onSync - A callback to be called every time all snapshot listeners are
 * in sync with each other.
 * @returns An unsubscribe function that can be called to cancel the snapshot
 * listener.
 */
export function onSnapshotsInSync(
  firestore: Firestore,
  onSync: () => void
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: Firestore,
  arg: unknown
): Unsubscribe {
  firestore = cast(firestore, Firestore);
  const client = ensureFirestoreConfigured(firestore);
  const observer = isPartialObserver(arg)
    ? (arg as PartialObserver<void>)
    : {
        next: arg as () => void
      };

  return firestoreClientAddSnapshotsInSyncListener(client, observer);
}

/**
 * Locally writes `mutations` on the async queue.
 * @internal
 */
export function executeWrite(
  firestore: Firestore,
  mutations: Mutation[]
): Promise<void> {
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientWrite(client, mutations);
}

/**
 * Converts a {@link ViewSnapshot} that contains the single document specified by `ref`
 * to a {@link DocumentSnapshot}.
 */
function convertToDocSnapshot<AppModelType, DbModelType extends DocumentData>(
  firestore: Firestore,
  ref: DocumentReference<AppModelType, DbModelType>,
  snapshot: ViewSnapshot
): DocumentSnapshot<AppModelType, DbModelType> {
  debugAssert(
    snapshot.docs.size <= 1,
    'Expected zero or a single result on a document-only query'
  );
  const doc = snapshot.docs.get(ref._key);

  const userDataWriter = new ExpUserDataWriter(firestore);
  return new DocumentSnapshot<AppModelType, DbModelType>(
    firestore,
    userDataWriter,
    ref._key,
    doc,
    new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache),
    ref.converter
  );
}

/**
 * Ensures the data required to construct an {@link onSnapshot} listener exist in a `snapshotJson`
 * object that originates from {@link DocumentSnapshot.toJSON} or {@link Querysnapshot.toJSON}. The
 * data is normalized into a typed object.
 *
 * @param snapshotJson - The JSON object that the app provided to {@link onSnapshot}.
 * @returns A normalized object that contains all of the required bundle JSON fields. If
 * {@link snapshotJson} doesn't contain the required fields, or if the fields exist as empty
 * strings, then the {@link snapshotJson.error} field will be a non empty string.
 *
 * @internal
 */
function normalizeSnapshotJsonFields(snapshotJson: object): {
  bundle: string;
  bundleName: string;
  bundleSource: string;
  error?: string;
} {
  const result: {
    bundle: string;
    bundleName: string;
    bundleSource: string;
    error?: string;
  } = {
    bundle: '',
    bundleName: '',
    bundleSource: ''
  };
  const requiredKeys = ['bundle', 'bundleName', 'bundleSource'];
  for (const key of requiredKeys) {
    if (!(key in snapshotJson)) {
      result.error = `snapshotJson missing required field: ${key}`;
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (snapshotJson as any)[key];
    if (typeof value !== 'string') {
      result.error = `snapshotJson field '${key}' must be a string.`;
      break;
    }
    if (value.length === 0) {
      result.error = `snapshotJson field '${key}' cannot be an empty string.`;
      break;
    }
    if (key === 'bundle') {
      result.bundle = value;
    } else if (key === 'bundleName') {
      result.bundleName = value;
    } else if (key === 'bundleSource') {
      result.bundleSource = value;
    }
  }
  return result;
}

/**
 * Loads the bundle in a separate task and then invokes {@link onSnapshot} with a
 * {@link DocumentReference} for the document in the bundle.
 *
 * @param firestore - The {@link Firestore} instance for the {@link onSnapshot} operation request.
 * @param json - The JSON bundle to load, produced by {@link DocumentSnapshot.toJSON}.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel the snapshot
 * listener.
 *
 * @internal
 */
function onSnapshotDocumentSnapshotBundle<
  AppModelType,
  DbModelType extends DocumentData
>(
  db: Firestore,
  json: { bundle: string; bundleName: string; bundleSource: string },
  options: SnapshotListenOptions | undefined,
  observer: {
    next: (snapshot: DocumentSnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  },
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe {
  let unsubscribed: boolean = false;
  let internalUnsubscribe: Unsubscribe | undefined;
  const loadTask = loadBundle(db, json.bundle);
  loadTask
    .then(() => {
      if (!unsubscribed) {
        const docReference = new DocumentReference(
          db,
          converter ? converter : null,
          DocumentKey.fromPath(json.bundleName)
        );
        internalUnsubscribe = onSnapshot(
          docReference as DocumentReference<AppModelType, DbModelType>,
          options ? options : {},
          observer
        );
      }
    })
    .catch(e => {
      if (observer.error) {
        observer.error(e);
      }
      return () => {};
    });
  return () => {
    if (unsubscribed) {
      return;
    }
    unsubscribed = true;
    if (internalUnsubscribe) {
      internalUnsubscribe();
    }
  };
}

/**
 * Loads the bundle in a separate task and then invokes {@link onSnapshot} with a
 * {@link Query} that represents the Query in the bundle.
 *
 * @param firestore - The {@link Firestore} instance for the {@link onSnapshot} operation request.
 * @param json - The JSON bundle to load, produced by {@link QuerySnapshot.toJSON}.
 * @param options - Options controlling the listen behavior.
 * @param observer - A single object containing `next` and `error` callbacks.
 * @param converter - An optional object that converts objects from Firestore before the onNext
 * listener is invoked.
 * @returns An unsubscribe function that can be called to cancel the snapshot
 * listener.
 *
 * @internal
 */
function onSnapshotQuerySnapshotBundle<
  AppModelType,
  DbModelType extends DocumentData
>(
  db: Firestore,
  json: { bundle: string; bundleName: string; bundleSource: string },
  options: SnapshotListenOptions | undefined,
  observer: {
    next: (snapshot: QuerySnapshot<AppModelType, DbModelType>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  },
  converter?: FirestoreDataConverter<DbModelType>
): Unsubscribe {
  let unsubscribed: boolean = false;
  let internalUnsubscribe: Unsubscribe | undefined;
  const loadTask = loadBundle(db, json.bundle);
  loadTask
    .then(() => namedQuery(db, json.bundleName))
    .then(query => {
      if (query && !unsubscribed) {
        const realQuery: Query = (query as Query)!;
        if (converter) {
          realQuery.withConverter(converter);
        }
        internalUnsubscribe = onSnapshot(
          query as Query<AppModelType, DbModelType>,
          options ? options : {},
          observer
        );
      }
    })
    .catch(e => {
      if (observer.error) {
        observer.error(e);
      }
      return () => {};
    });
  return () => {
    if (unsubscribed) {
      return;
    }
    unsubscribed = true;
    if (internalUnsubscribe) {
      internalUnsubscribe();
    }
  };
}

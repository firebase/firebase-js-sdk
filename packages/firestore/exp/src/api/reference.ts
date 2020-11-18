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
import {
  ParsedUpdateData,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs
} from '../../../src/api/user_data_reader';
import { debugAssert } from '../../../src/util/assert';
import { cast } from '../../../src/util/input_validation';
import { DocumentSnapshot, QuerySnapshot } from './snapshot';
import {
  applyFirestoreDataConverter,
  ensureFirestoreConfigured,
  SnapshotMetadata
} from '../../../src/api/database';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import {
  CollectionReference,
  doc,
  DocumentReference,
  newUserDataReader,
  Query,
  SetOptions,
  UpdateData,
  validateHasExplicitOrderByForLimitToLast
} from '../../../lite/src/api/reference';
import { Document } from '../../../src/model/document';
import {
  DeleteMutation,
  Mutation,
  Precondition
} from '../../../src/model/mutation';
import { FieldPath } from '../../../lite/src/api/field_path';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver,
  Unsubscribe
} from '../../../src/api/observer';
import {
  executeQueryFromCache,
  executeQueryViaSnapshotListener,
  firestoreClientWrite,
  getEventManager,
  getLocalStore,
  readDocumentFromCache,
  readDocumentViaSnapshotListener
} from '../../../src/core/firestore_client';
import {
  newQueryForPath,
  Query as InternalQuery
} from '../../../src/core/query';
import { Deferred } from '../../../src/util/promise';
import { AsyncObserver } from '../../../src/util/async_observer';
import {
  addSnapshotsInSyncListener,
  eventManagerListen,
  eventManagerUnlisten,
  QueryListener,
  removeSnapshotsInSyncListener
} from '../../../src/core/event_manager';
import { FirestoreError } from '../../../src/util/error';
import { Compat } from '../../../src/compat/compat';
import { ByteString } from '../../../src/util/byte_string';
import { Bytes } from '../../../lite/src/api/bytes';
import { AbstractUserDataWriter } from '../../../src/api/user_data_writer';

export {
  DocumentReference,
  CollectionReference,
  Query,
  collection,
  collectionGroup,
  doc,
  query,
  where,
  limit,
  limitToLast,
  orderBy,
  startAt,
  startAfter,
  endAt,
  endBefore,
  queryEqual
} from '../../../lite/src/api/reference';

/**
 * An options object that can be passed to {@link onSnapshot()} and {@link
 * QuerySnapshot#docChanges} to control which types of changes to include in the
 * result set.
 */
export interface SnapshotListenOptions {
  /**
   * Include a change even if only the metadata of the query or of a document
   * changed. Default is false.
   */
  readonly includeMetadataChanges?: boolean;
}

/**
 * Reads the document referred to by this `DocumentReference`.
 *
 * Note: `getDoc()` attempts to provide up-to-date data when possible by waiting
 * for data from the server, but it may return cached data or fail if you are
 * offline and the server cannot be reached. To specify this behavior, invoke
 * {@link getDocFromCache()} or {@link getDocFromServer()}.
 *
 * @param reference The reference of the document to fetch.
 * @return A Promise resolved with a `DocumentSnapshot` containing the
 * current document contents.
 */
export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  reference = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast(reference.firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);

  const deferred = new Deferred<ViewSnapshot>();
  firestore._queue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    await readDocumentViaSnapshotListener(
      eventManager,
      firestore._queue,
      reference._key,
      { source: 'default' },
      deferred
    );
  });
  return deferred.promise.then(snapshot =>
    convertToDocSnapshot(firestore, reference, snapshot)
  );
}

export class ExpUserDataWriter extends AbstractUserDataWriter {
  constructor(protected firestore: FirebaseFirestore) {
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
 * @return A Promise resolved with a `DocumentSnapshot` containing the
 * current document contents.
 */
export function getDocFromCache<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  reference = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast(reference.firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  const deferred = new Deferred<Document | null>();
  firestore._queue.enqueueAndForget(async () => {
    const localStore = await getLocalStore(client);
    await readDocumentFromCache(localStore, reference._key, deferred);
  });
  return deferred.promise.then(
    doc =>
      new DocumentSnapshot(
        firestore,
        userDataWriter,
        reference._key,
        doc,
        new SnapshotMetadata(
          doc instanceof Document ? doc.hasLocalMutations : false,
          /* fromCache= */ true
        ),
        reference._converter
      )
  );
}

/**
 * Reads the document referred to by this `DocumentReference` from the server.
 * Returns an error if the network is not available.
 *
 * @return A Promise resolved with a `DocumentSnapshot` containing the
 * current document contents.
 */
export function getDocFromServer<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  reference = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast(reference.firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);

  const deferred = new Deferred<ViewSnapshot>();
  firestore._queue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    await readDocumentViaSnapshotListener(
      eventManager,
      firestore._queue,
      reference._key,
      { source: 'server' },
      deferred
    );
  });
  return deferred.promise.then(snapshot =>
    convertToDocSnapshot(firestore, reference, snapshot)
  );
}

/**
 * Executes the query and returns the results as a `QuerySnapshot`.
 *
 * Note: `getDocs()` attempts to provide up-to-date data when possible by
 * waiting for data from the server, but it may return cached data or fail if
 * you are offline and the server cannot be reached. To specify this behavior,
 * invoke {@link getDocsFromCache()} or {@link getDocsFromServer()}.
 *
 * @return A Promise that will be resolved with the results of the query.
 */
export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
  query = cast<Query<T>>(query, Query);
  const firestore = cast(query.firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  validateHasExplicitOrderByForLimitToLast(query._query);

  const deferred = new Deferred<ViewSnapshot>();
  firestore._queue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    await executeQueryViaSnapshotListener(
      eventManager,
      firestore._queue,
      query._query,
      { source: 'default' },
      deferred
    );
  });
  return deferred.promise.then(
    snapshot => new QuerySnapshot(firestore, userDataWriter, query, snapshot)
  );
}

/**
 * Executes the query and returns the results as a `QuerySnapshot` from cache.
 * Returns an error if the document is not currently cached.
 *
 * @return A Promise that will be resolved with the results of the query.
 */
export function getDocsFromCache<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>> {
  query = cast<Query<T>>(query, Query);
  const firestore = cast(query.firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  const deferred = new Deferred<ViewSnapshot>();
  firestore._queue.enqueueAndForget(async () => {
    const localStore = await getLocalStore(client);
    await executeQueryFromCache(localStore, query._query, deferred);
  });
  return deferred.promise.then(
    snapshot => new QuerySnapshot(firestore, userDataWriter, query, snapshot)
  );
}

/**
 * Executes the query and returns the results as a `QuerySnapshot` from the
 * server. Returns an error if the network is not available.
 *
 * @return A Promise that will be resolved with the results of the query.
 */
export function getDocsFromServer<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>> {
  query = cast<Query<T>>(query, Query);
  const firestore = cast(query.firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);
  const userDataWriter = new ExpUserDataWriter(firestore);

  const deferred = new Deferred<ViewSnapshot>();
  firestore._queue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    await executeQueryViaSnapshotListener(
      eventManager,
      firestore._queue,
      query._query,
      { source: 'server' },
      deferred
    );
  });
  return deferred.promise.then(
    snapshot => new QuerySnapshot(firestore, userDataWriter, query, snapshot)
  );
}

/**
 * Writes to the document referred to by this `DocumentReference`. If the
 * document does not yet exist, it will be created.
 *
 * @param reference A reference to the document to write.
 * @param data A map of the fields and values for the document.
 * @return A Promise resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
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
 * @param reference A reference to the document to write.
 * @param data A map of the fields and values for the document.
 * @param options An object to configure the set behavior.
 * @return A Promise resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
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
  const firestore = cast(reference.firestore, FirebaseFirestore);

  const convertedValue = applyFirestoreDataConverter(
    reference._converter,
    data,
    options
  );
  const dataReader = newUserDataReader(firestore);
  const parsed = parseSetData(
    dataReader,
    'setDoc',
    reference._key,
    convertedValue,
    reference._converter !== null,
    options
  );

  const mutations = parsed.toMutations(reference._key, Precondition.none());
  return executeWrite(firestore, mutations);
}

/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference`. The update will fail if applied to a document that does
 * not exist.
 *
 * @param reference A reference to the document to update.
 * @param data An object containing the fields and values with which to
 * update the document. Fields can contain dots to reference nested fields
 * within the document.
 * @return A Promise resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
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
 * @param reference A reference to the document to update.
 * @param field The first field to update.
 * @param value The first value.
 * @param moreFieldsAndValues Additional key value pairs.
 * @return A Promise resolved once the data has been successfully written
 * to the backend (note that it won't resolve while you're offline).
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
  const firestore = cast(reference.firestore, FirebaseFirestore);

  const dataReader = newUserDataReader(firestore);

  // For Compat types, we have to "extract" the underlying types before
  // performing validation.
  if (fieldOrUpdateData instanceof Compat) {
    fieldOrUpdateData = fieldOrUpdateData._delegate;
  }

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

  const mutations = parsed.toMutations(
    reference._key,
    Precondition.exists(true)
  );
  return executeWrite(firestore, mutations);
}

/**
 * Deletes the document referred to by the specified `DocumentReference`.
 *
 * @param reference A reference to the document to delete.
 * @return A Promise resolved once the document has been successfully
 * deleted from the backend (note that it won't resolve while you're offline).
 */
export function deleteDoc(
  reference: DocumentReference<unknown>
): Promise<void> {
  const firestore = cast(reference.firestore, FirebaseFirestore);
  const mutations = [new DeleteMutation(reference._key, Precondition.none())];
  return executeWrite(firestore, mutations);
}

/**
 * Add a new document to specified `CollectionReference` with the given data,
 * assigning it a document ID automatically.
 *
 * @param reference A reference to the collection to add this document to.
 * @param data An Object containing the data for the new document.
 * @return A Promise resolved with a `DocumentReference` pointing to the
 * newly created document after it has been written to the backend (Note that it
 * won't resolve while you're offline).
 */
export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  const firestore = cast(reference.firestore, FirebaseFirestore);

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
    reference._converter !== null,
    {}
  );

  const mutations = parsed.toMutations(docRef._key, Precondition.exists(false));
  return executeWrite(firestore, mutations).then(() => docRef);
}

// TODO(firestorexp): Make sure these overloads are tested via the Firestore
// integration tests

/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param reference A reference to the document to listen to.
 * @param observer A single object containing `next` and `error` callbacks.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param reference A reference to the document to listen to.
 * @param options Options controlling the listen behavior.
 * @param observer A single object containing `next` and `error` callbacks.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param reference A reference to the document to listen to.
 * @param onNext A callback to be called every time a new `DocumentSnapshot`
 * is available.
 * @param onError A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @param onCompletion Can be provided, but will not be called since streams are
 * never ending.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Attaches a listener for `DocumentSnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param reference A reference to the document to listen to.
 * @param options Options controlling the listen behavior.
 * @param onNext A callback to be called every time a new `DocumentSnapshot`
 * is available.
 * @param onError A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @param onCompletion Can be provided, but will not be called since streams are
 * never ending.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query The query to listen to.
 * @param observer A single object containing `next` and `error` callbacks.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query The query to listen to.
 * @param options Options controlling the listen behavior.
 * @param observer A single object containing `next` and `error` callbacks.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query The query to listen to.
 * @param onNext A callback to be called every time a new `QuerySnapshot`
 * is available.
 * @param onCompletion Can be provided, but will not be called since streams are
 * never ending.
 * @param onError A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Attaches a listener for `QuerySnapshot` events. You may either pass
 * individual `onNext` and `onError` callbacks or pass a single observer
 * object with `next` and `error` callbacks. The listener can be cancelled by
 * calling the function that is returned when `onSnapshot` is called.
 *
 * NOTE: Although an `onCompletion` callback can be provided, it will
 * never be called because the snapshot stream is never-ending.
 *
 * @param query The query to listen to.
 * @param options Options controlling the listen behavior.
 * @param onNext A callback to be called every time a new `QuerySnapshot`
 * is available.
 * @param onCompletion Can be provided, but will not be called since streams are
 * never ending.
 * @param onError A callback to be called if the listen fails or is
 * cancelled. No further callbacks will occur.
 * @return An unsubscribe function that can be called to cancel
 * the snapshot listener.
 */
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  reference: Query<T> | DocumentReference<T>,
  ...args: unknown[]
): Unsubscribe {
  if (reference instanceof Compat) {
    reference = reference._delegate;
  }

  let options: SnapshotListenOptions = {
    includeMetadataChanges: false
  };
  let currArg = 0;
  if (typeof args[currArg] === 'object' && !isPartialObserver(args[currArg])) {
    options = args[currArg] as SnapshotListenOptions;
    currArg++;
  }

  const internalOptions = {
    includeMetadataChanges: options.includeMetadataChanges
  };

  if (isPartialObserver(args[currArg])) {
    const userObserver = args[currArg] as PartialObserver<QuerySnapshot<T>>;
    args[currArg] = userObserver.next?.bind(userObserver);
    args[currArg + 1] = userObserver.error?.bind(userObserver);
    args[currArg + 2] = userObserver.complete?.bind(userObserver);
  }

  let observer: PartialObserver<ViewSnapshot>;
  let firestore: FirebaseFirestore;
  let internalQuery: InternalQuery;

  if (reference instanceof DocumentReference) {
    firestore = cast(reference.firestore, FirebaseFirestore);
    internalQuery = newQueryForPath(reference._key.path);

    observer = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<DocumentSnapshot<T>>)(
            convertToDocSnapshot(
              firestore,
              reference as DocumentReference<T>,
              snapshot
            )
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };
  } else {
    const query = cast<Query<T>>(reference, Query);
    firestore = cast(query.firestore, FirebaseFirestore);
    internalQuery = reference._query;
    const userDataWriter = new ExpUserDataWriter(firestore);

    observer = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<QuerySnapshot<T>>)(
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

  const wrappedObserver = new AsyncObserver(observer);
  const listener = new QueryListener(
    internalQuery,
    wrappedObserver,
    internalOptions
  );
  firestore._queue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    return eventManagerListen(eventManager, listener);
  });

  return () => {
    wrappedObserver.mute();
    firestore._queue.enqueueAndForget(async () => {
      const eventManager = await getEventManager(client);
      return eventManagerUnlisten(eventManager, listener);
    });
  };
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
 * @param firestore The instance of Firestore for synchronizing snapshots.
 * @param observer A single object containing `next` and `error` callbacks.
 * @return An unsubscribe function that can be called to cancel the snapshot
 * listener.
 */
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
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
 * with the server. Use SnapshotMetadata in the individual listeners to
 * determine if a snapshot is from the cache or the server.
 *
 * @param firestore The instance of Firestore for synchronizing snapshots.
 * @param onSync A callback to be called every time all snapshot listeners are
 * in sync with each other.
 * @return An unsubscribe function that can be called to cancel the snapshot
 * listener.
 */
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  onSync: () => void
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: FirebaseFirestore,
  arg: unknown
): Unsubscribe {
  firestore = cast(firestore, FirebaseFirestore);
  const client = ensureFirestoreConfigured(firestore);

  const observer = isPartialObserver(arg)
    ? (arg as PartialObserver<void>)
    : {
        next: arg as () => void
      };

  const wrappedObserver = new AsyncObserver(observer);
  firestore._queue.enqueueAndForget(async () => {
    const eventManager = await getEventManager(client);
    addSnapshotsInSyncListener(eventManager, wrappedObserver);
  });

  return () => {
    wrappedObserver.mute();
    firestore._queue.enqueueAndForget(async () => {
      const eventManager = await getEventManager(client);
      removeSnapshotsInSyncListener(eventManager, wrappedObserver);
    });
  };
}

/** Locally writes `mutations` on the async queue. */
export function executeWrite(
  firestore: FirebaseFirestore,
  mutations: Mutation[]
): Promise<void> {
  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientWrite(client, mutations);
}

/**
 * Converts a ViewSnapshot that contains the single document specified by `ref`
 * to a DocumentSnapshot.
 */
function convertToDocSnapshot<T>(
  firestore: FirebaseFirestore,
  ref: DocumentReference<T>,
  snapshot: ViewSnapshot
): DocumentSnapshot<T> {
  debugAssert(
    snapshot.docs.size <= 1,
    'Expected zero or a single result on a document-only query'
  );
  const doc = snapshot.docs.get(ref._key);

  const userDataWriter = new ExpUserDataWriter(firestore);
  return new DocumentSnapshot(
    firestore,
    userDataWriter,
    ref._key,
    doc,
    new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache),
    ref._converter
  );
}

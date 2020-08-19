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

import { Firestore } from './database';
import {
  DocumentKeyReference,
  ParsedUpdateData,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs
} from '../../../src/api/user_data_reader';
import { debugAssert } from '../../../src/util/assert';
import { cast } from '../../../lite/src/api/util';
import { DocumentSnapshot, QuerySnapshot } from './snapshot';
import {
  applyFirestoreDataConverter,
  SnapshotMetadata,
  validateHasExplicitOrderByForLimitToLast
} from '../../../src/api/database';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import {
  CollectionReference,
  doc,
  DocumentReference,
  newUserDataReader,
  Query,
  SetOptions,
  UpdateData
} from '../../../lite/src/api/reference';
import { Document } from '../../../src/model/document';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import { FieldPath } from '../../../lite/src/api/field_path';
import {
  CompleteFn,
  ErrorFn,
  isPartialObserver,
  NextFn,
  PartialObserver,
  Unsubscribe
} from '../../../src/api/observer';
import { getEventManager, getLocalStore, getSyncEngine } from './components';
import {
  enqueueExecuteQueryFromCache,
  enqueueExecuteQueryViaSnapshotListener,
  enqueueListen,
  enqueueReadDocumentFromCache,
  enqueueReadDocumentViaSnapshotListener,
  enqueueSnapshotsInSyncListen,
  enqueueWrite
} from '../../../src/core/firestore_client';
import { newQueryForPath } from '../../../src/core/query';

export interface SnapshotListenOptions {
  readonly includeMetadataChanges?: boolean;
}

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

export interface FirestoreError {
  code: FirestoreErrorCode;
  message: string;
  name: string;
  stack?: string;
}

export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return getEventManager(firestore).then(eventManager =>
    enqueueReadDocumentViaSnapshotListener(
      firestore._queue,
      eventManager,
      ref._key
    ).then(doc => convertToDocSnapshot(firestore, ref, doc))
  );
}

export function getDocFromCache<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return getLocalStore(firestore).then(localStore =>
    enqueueReadDocumentFromCache(firestore._queue, localStore, ref._key).then(
      doc =>
        new DocumentSnapshot(
          firestore,
          ref._key,
          doc,
          new SnapshotMetadata(
            doc instanceof Document ? doc.hasLocalMutations : false,
            /* fromCache= */ true
          ),
          ref._converter
        )
    )
  );
}

export function getDocFromServer<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return getEventManager(firestore).then(eventManager =>
    enqueueReadDocumentViaSnapshotListener(
      firestore._queue,
      eventManager,
      ref._key,
      { source: 'server' }
    ).then(viewSnapshot => convertToDocSnapshot(firestore, ref, viewSnapshot))
  );
}

export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  const firestore = cast<Firestore>(query.firestore, Firestore);

  validateHasExplicitOrderByForLimitToLast(internalQuery._query);
  return getEventManager(firestore).then(eventManager =>
    enqueueExecuteQueryViaSnapshotListener(
      firestore._queue,
      eventManager,
      internalQuery._query
    ).then(snapshot => new QuerySnapshot(firestore, internalQuery, snapshot))
  );
}

export function getDocsFromCache<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  const firestore = cast<Firestore>(query.firestore, Firestore);
  return getLocalStore(firestore).then(localStore =>
    enqueueExecuteQueryFromCache(
      firestore._queue,
      localStore,
      internalQuery._query
    ).then(snapshot => new QuerySnapshot(firestore, internalQuery, snapshot))
  );
}

export function getDocsFromServer<T>(
  query: Query<T>
): Promise<QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  const firestore = cast<Firestore>(query.firestore, Firestore);
  return getEventManager(firestore).then(eventManager =>
    enqueueExecuteQueryViaSnapshotListener(
      firestore._queue,
      eventManager,
      internalQuery._query,
      { source: 'server' }
    ).then(snapshot => new QuerySnapshot(firestore, internalQuery, snapshot))
  );
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
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast(ref.firestore, Firestore);

  const convertedValue = applyFirestoreDataConverter(
    ref._converter,
    data,
    options
  );
  const dataReader = newUserDataReader(firestore);
  const parsed = parseSetData(
    dataReader,
    'setDoc',
    ref._key,
    convertedValue,
    ref._converter !== null,
    options
  );

  return getSyncEngine(firestore).then(syncEngine =>
    enqueueWrite(
      firestore._queue,
      syncEngine,
      parsed.toMutations(ref._key, Precondition.none())
    )
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
  const ref = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const firestore = cast(ref.firestore, Firestore);
  const dataReader = newUserDataReader(firestore);

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof FieldPath
  ) {
    parsed = parseUpdateVarargs(
      dataReader,
      'updateDoc',
      ref._key,
      fieldOrUpdateData,
      value,
      moreFieldsAndValues
    );
  } else {
    parsed = parseUpdateData(
      dataReader,
      'updateDoc',
      ref._key,
      fieldOrUpdateData
    );
  }

  return getSyncEngine(firestore).then(syncEngine =>
    enqueueWrite(
      firestore._queue,
      syncEngine,
      parsed.toMutations(ref._key, Precondition.exists(true))
    )
  );
}

export function deleteDoc(reference: DocumentReference): Promise<void> {
  const ref = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const firestore = cast(ref.firestore, Firestore);
  return getSyncEngine(firestore).then(syncEngine =>
    enqueueWrite(firestore._queue, syncEngine, [
      new DeleteMutation(ref._key, Precondition.none())
    ])
  );
}

export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  const collRef = cast<CollectionReference<T>>(reference, CollectionReference);
  const firestore = cast(collRef.firestore, Firestore);
  const docRef = doc(collRef);

  const convertedValue = applyFirestoreDataConverter(collRef.converter, data);

  const dataReader = newUserDataReader(collRef.firestore);
  const parsed = parseSetData(
    dataReader,
    'addDoc',
    docRef._key,
    convertedValue,
    collRef.converter !== null,
    {}
  );

  return getSyncEngine(firestore)
    .then(syncEngine =>
      enqueueWrite(
        firestore._queue,
        syncEngine,
        parsed.toMutations(docRef._key, Precondition.exists(false))
      )
    )
    .then(() => docRef);
}

// TODO(firestorexp): Make sure these overloads are tested via the Firestore
// integration tests
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: DocumentSnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  reference: DocumentReference<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onSnapshot<T>(
  ref: Query<T> | DocumentReference<T>,
  ...args: unknown[]
): Unsubscribe {
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

  let asyncUnsubscribe: Promise<Unsubscribe>;

  if (ref instanceof DocumentReference) {
    const firestore = cast(ref.firestore, Firestore);

    const observer: PartialObserver<ViewSnapshot> = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<DocumentSnapshot<T>>)(
            convertToDocSnapshot(firestore, ref, snapshot)
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };

    asyncUnsubscribe = getEventManager(firestore).then(eventManager =>
      enqueueListen(
        firestore._queue,
        eventManager,
        newQueryForPath(ref._key.path),
        internalOptions,
        observer
      )
    );
  } else {
    const query = cast<Query<T>>(ref, Query);
    const firestore = cast(query.firestore, Firestore);

    const observer: PartialObserver<ViewSnapshot> = {
      next: snapshot => {
        if (args[currArg]) {
          (args[currArg] as NextFn<QuerySnapshot<T>>)(
            new QuerySnapshot(firestore, query, snapshot)
          );
        }
      },
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };

    validateHasExplicitOrderByForLimitToLast(query._query);

    asyncUnsubscribe = getEventManager(firestore).then(eventManager =>
      enqueueListen(
        firestore._queue,
        eventManager,
        query._query,
        internalOptions,
        observer
      )
    );
  }

  // TODO(firestorexp): Add test that verifies that we don't raise a snapshot if
  // unsubscribe is called before `asyncObserver` resolves.
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    asyncUnsubscribe.then(unsubscribe => unsubscribe());
  };
}

// TODO(firestorexp): Make sure these overloads are tested via the Firestore
// integration tests
export function onSnapshotsInSync(
  firestore: Firestore,
  observer: {
    next?: (value: void) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: Firestore,
  onSync: () => void
): Unsubscribe;
export function onSnapshotsInSync(
  firestore: Firestore,
  arg: unknown
): Unsubscribe {
  const firestoreImpl = cast(firestore, Firestore);
  const observer = isPartialObserver(arg)
    ? (arg as PartialObserver<void>)
    : {
        next: arg as () => void
      };

  const asyncObserver = getEventManager(firestoreImpl).then(eventManager =>
    enqueueSnapshotsInSyncListen(firestoreImpl._queue, eventManager, observer)
  );

  // TODO(firestorexp): Add test that verifies that we don't raise a snapshot if
  // unsubscribe is called before `asyncObserver` resolves.
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    asyncObserver.then(unsubscribe => unsubscribe());
  };
}

/**
 * Converts a ViewSnapshot that contains the single document specified by `ref`
 * to a DocumentSnapshot.
 */
function convertToDocSnapshot<T>(
  firestore: Firestore,
  ref: DocumentKeyReference<T>,
  snapshot: ViewSnapshot
): DocumentSnapshot<T> {
  debugAssert(
    snapshot.docs.size <= 1,
    'Expected zero or a single result on a document-only query'
  );
  const doc = snapshot.docs.get(ref._key);

  return new DocumentSnapshot(
    firestore,
    ref._key,
    doc,
    new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache),
    ref._converter
  );
}

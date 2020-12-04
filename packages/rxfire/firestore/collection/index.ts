/**
 * @license
 * Copyright 2018 Google LLC
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

import firebase from 'firebase/app';
import { fromCollectionRef } from '../fromRef';
import {
  Observable,
  MonoTypeOperatorFunction,
  OperatorFunction,
  pipe,
  UnaryFunction
} from 'rxjs';
import {
  map,
  filter,
  scan,
  distinctUntilChanged,
  startWith,
  pairwise
} from 'rxjs/operators';
import { snapToData } from '../document';

type DocumentChangeType = firebase.firestore.DocumentChangeType;
type DocumentChange = firebase.firestore.DocumentChange;
type Query = firebase.firestore.Query;
type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
type QuerySnapshot = firebase.firestore.QuerySnapshot;

const ALL_EVENTS: DocumentChangeType[] = ['added', 'modified', 'removed'];

/**
 * Create an operator that determines if a the stream of document changes
 * are specified by the event filter. If the document change type is not
 * in specified events array, it will not be emitted.
 */
const filterEvents = (
  events?: DocumentChangeType[]
): MonoTypeOperatorFunction<DocumentChange[]> =>
  filter((changes: DocumentChange[]) => {
    let hasChange = false;
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      if (events && events.indexOf(change.type) >= 0) {
        hasChange = true;
        break;
      }
    }
    return hasChange;
  });

/**
 * Splice arguments on top of a sliced array, to break top-level ===
 * this is useful for change-detection
 */
function sliceAndSplice<T>(
  original: T[],
  start: number,
  deleteCount: number,
  ...args: T[]
): T[] {
  const returnArray = original.slice();
  returnArray.splice(start, deleteCount, ...args);
  return returnArray;
}

/**
 * Creates a new sorted array from a new change.
 * @param combined
 * @param change
 */
function processIndividualChange(
  combined: DocumentChange[],
  change: DocumentChange
): DocumentChange[] {
  switch (change.type) {
    case 'added':
      if (
        combined[change.newIndex] &&
        combined[change.newIndex].doc.ref.isEqual(change.doc.ref)
      ) {
        // Skip duplicate emissions. This is rare.
        // TODO: Investigate possible bug in SDK.
      } else {
        return sliceAndSplice(combined, change.newIndex, 0, change);
      }
      break;
    case 'modified':
      if (
        combined[change.oldIndex] == null ||
        combined[change.oldIndex].doc.ref.isEqual(change.doc.ref)
      ) {
        // When an item changes position we first remove it
        // and then add it's new position
        if (change.oldIndex !== change.newIndex) {
          const copiedArray = combined.slice();
          copiedArray.splice(change.oldIndex, 1);
          copiedArray.splice(change.newIndex, 0, change);
          return copiedArray;
        } else {
          return sliceAndSplice(combined, change.newIndex, 1, change);
        }
      }
      break;
    case 'removed':
      if (
        combined[change.oldIndex] &&
        combined[change.oldIndex].doc.ref.isEqual(change.doc.ref)
      ) {
        return sliceAndSplice(combined, change.oldIndex, 1);
      }
      break;
    default: // ignore
  }
  return combined;
}

/**
 * Combines the total result set from the current set of changes from an incoming set
 * of changes.
 * @param current
 * @param changes
 * @param events
 */
function processDocumentChanges(
  current: DocumentChange[],
  changes: DocumentChange[],
  events: DocumentChangeType[] = ALL_EVENTS
): DocumentChange[] {
  changes.forEach(change => {
    // skip unwanted change types
    if (events.indexOf(change.type) > -1) {
      current = processIndividualChange(current, change);
    }
  });
  return current;
}

/**
 * Create an operator that allows you to compare the current emission with
 * the prior, even on first emission (where prior is undefined).
 */
const windowwise = <T = unknown>() =>
  pipe(
    startWith(undefined),
    pairwise() as OperatorFunction<T | undefined, [T | undefined, T]>
  );

/**
 * Given two snapshots does their metadata match?
 * @param a
 * @param b
 */
const metaDataEquals = <T extends QuerySnapshot | QueryDocumentSnapshot>(
  a: T,
  b: T
) => JSON.stringify(a.metadata) === JSON.stringify(b.metadata);

/**
 * Create an operator that filters out empty changes. We provide the
 * ability to filter on events, which means all changes can be filtered out.
 * This creates an empty array and would be incorrect to emit.
 */
const filterEmptyUnlessFirst = <T = unknown>(): UnaryFunction<
  Observable<T[]>,
  Observable<T[]>
> =>
  pipe(
    windowwise(),
    filter(([prior, current]) => current.length > 0 || prior === undefined),
    map(([_, current]) => current)
  );

/**
 * Return a stream of document changes on a query. These results are not in sort order but in
 * order of occurence.
 * @param query
 */
export function collectionChanges(
  query: Query,
  events: DocumentChangeType[] = ALL_EVENTS
): Observable<DocumentChange[]> {
  return fromCollectionRef(query, { includeMetadataChanges: true }).pipe(
    windowwise(),
    map(([priorSnapshot, currentSnapshot]) => {
      const docChanges = currentSnapshot.docChanges();
      if (priorSnapshot && !metaDataEquals(priorSnapshot, currentSnapshot)) {
        // the metadata has changed, docChanges() doesn't return metadata events, so let's
        // do it ourselves by scanning over all the docs and seeing if the metadata has changed
        // since either this docChanges() emission or the prior snapshot
        currentSnapshot.docs.forEach((currentDocSnapshot, currentIndex) => {
          const currentDocChange = docChanges.find(c =>
            c.doc.ref.isEqual(currentDocSnapshot.ref)
          );
          if (currentDocChange) {
            // if the doc is in the current changes and the metadata hasn't changed this doc
            if (metaDataEquals(currentDocChange.doc, currentDocSnapshot)) {
              return;
            }
          } else {
            // if there is a prior doc and the metadata hasn't changed skip this doc
            const priorDocSnapshot = priorSnapshot?.docs.find(d =>
              d.ref.isEqual(currentDocSnapshot.ref)
            );
            if (
              priorDocSnapshot &&
              metaDataEquals(priorDocSnapshot, currentDocSnapshot)
            ) {
              return;
            }
          }
          docChanges.push({
            oldIndex: currentIndex,
            newIndex: currentIndex,
            type: 'modified',
            doc: currentDocSnapshot
          });
        });
      }
      return docChanges;
    }),
    filterEvents(events),
    filterEmptyUnlessFirst()
  );
}

/**
 * Return a stream of document snapshots on a query. These results are in sort order.
 * @param query
 */
export function collection(query: Query): Observable<QueryDocumentSnapshot[]> {
  return fromCollectionRef(query, { includeMetadataChanges: true }).pipe(
    map(changes => changes.docs)
  );
}

/**
 * Return a stream of document changes on a query. These results are in sort order.
 * @param query
 */
export function sortedChanges(
  query: Query,
  events?: DocumentChangeType[]
): Observable<DocumentChange[]> {
  return collectionChanges(query, events).pipe(
    scan(
      (current: DocumentChange[], changes: DocumentChange[]) =>
        processDocumentChanges(current, changes, events),
      []
    ),
    distinctUntilChanged()
  );
}

/**
 * Create a stream of changes as they occur it time. This method is similar
 * to docChanges() but it collects each event in an array over time.
 */
export function auditTrail(
  query: Query,
  events?: DocumentChangeType[]
): Observable<DocumentChange[]> {
  return collectionChanges(query, events).pipe(
    scan((current, action) => [...current, ...action], [] as DocumentChange[])
  );
}

/**
 * Returns a stream of documents mapped to their data payload, and optionally the document ID
 * @param query
 */
export function collectionData<T>(
  query: Query,
  idField?: string
): Observable<T[]> {
  return collection(query).pipe(
    map(arr => {
      return arr.map(snap => snapToData(snap, idField) as T);
    })
  );
}

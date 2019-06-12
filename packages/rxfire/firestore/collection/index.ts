/**
 * @license
 * Copyright 2018 Google Inc.
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

import { firestore } from 'firebase/app';
import { fromCollectionRef } from '../fromRef';
import { Observable, MonoTypeOperatorFunction } from 'rxjs';
import { map, filter, scan } from 'rxjs/operators';
import { snapToData } from '../document';

const ALL_EVENTS: firestore.DocumentChangeType[] = [
  'added',
  'modified',
  'removed'
];

/**
 * Create an operator that determines if a the stream of document changes
 * are specified by the event filter. If the document change type is not
 * in specified events array, it will not be emitted.
 */
const filterEvents = (
  events?: firestore.DocumentChangeType[]
): MonoTypeOperatorFunction<firestore.DocumentChange[]> =>
  filter((changes: firestore.DocumentChange[]) => {
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
 * Create an operator that filters out empty changes. We provide the
 * ability to filter on events, which means all changes can be filtered out.
 * This creates an empty array and would be incorrect to emit.
 */
const filterEmpty = filter(
  (changes: firestore.DocumentChange[]) => changes.length > 0
);

/**
 * Creates a new sorted array from a new change.
 * @param combined
 * @param change
 */
function processIndividualChange(
  combined: firestore.DocumentChange[],
  change: firestore.DocumentChange
): firestore.DocumentChange[] {
  switch (change.type) {
    case 'added':
      if (
        combined[change.newIndex] &&
        combined[change.newIndex].doc.id === change.doc.id
      ) {
        // Skip duplicate emissions. This is rare.
        // TODO: Investigate possible bug in SDK.
      } else {
        combined.splice(change.newIndex, 0, change);
      }
      break;
    case 'modified':
      if (
        combined[change.oldIndex] == null ||
        combined[change.oldIndex].doc.id === change.doc.id
      ) {
        // When an item changes position we first remove it
        // and then add it's new position
        if (change.oldIndex !== change.newIndex) {
          combined.splice(change.oldIndex, 1);
          combined.splice(change.newIndex, 0, change);
        } else {
          combined[change.newIndex] = change;
        }
      }
      break;
    case 'removed':
      if (
        combined[change.oldIndex] &&
        combined[change.oldIndex].doc.id === change.doc.id
      ) {
        combined.splice(change.oldIndex, 1);
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
  current: firestore.DocumentChange[],
  changes: firestore.DocumentChange[],
  events: firestore.DocumentChangeType[] = ALL_EVENTS
): firestore.DocumentChange[] {
  changes.forEach(change => {
    // skip unwanted change types
    if (events.indexOf(change.type) > -1) {
      current = processIndividualChange(current, change);
    }
  });
  return current;
}

/**
 * Return a stream of document changes on a query. These results are not in sort order but in
 * order of occurence.
 * @param query
 */
export function collectionChanges(
  query: firestore.Query,
  events: firestore.DocumentChangeType[] = ALL_EVENTS
): Observable<firestore.DocumentChange[]> {
  return fromCollectionRef(query).pipe(
    map(snapshot => snapshot.docChanges()),
    filterEvents(events),
    filterEmpty
  );
}

/**
 * Return a stream of document snapshots on a query. These results are in sort order.
 * @param query
 */
export function collection(
  query: firestore.Query
): Observable<firestore.QueryDocumentSnapshot[]> {
  return fromCollectionRef(query).pipe(map(changes => changes.docs));
}

/**
 * Return a stream of document changes on a query. These results are in sort order.
 * @param query
 */
export function sortedChanges(
  query: firestore.Query,
  events?: firestore.DocumentChangeType[]
): Observable<firestore.DocumentChange[]> {
  return collectionChanges(query, events).pipe(
    scan(
      (
        current: firestore.DocumentChange[],
        changes: firestore.DocumentChange[]
      ) => processDocumentChanges(current, changes, events),
      []
    )
  );
}

/**
 * Create a stream of changes as they occur it time. This method is similar
 * to docChanges() but it collects each event in an array over time.
 */
export function auditTrail(
  query: firestore.Query,
  events?: firestore.DocumentChangeType[]
): Observable<firestore.DocumentChange[]> {
  return collectionChanges(query, events).pipe(
    scan((current, action) => [...current, ...action], [])
  );
}

/**
 * Returns a stream of documents mapped to their data payload, and optionally the document ID
 * @param query
 */
export function collectionData<T>(
  query: firestore.Query,
  idField?: string
): Observable<T[]> {
  return collection(query).pipe(
    map(arr => {
      return arr.map(snap => snapToData(snap, idField) as T);
    })
  );
}

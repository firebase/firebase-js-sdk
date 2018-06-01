import { firestore } from 'firebase/app';
import { fromCollectionRef } from '../fromRef';
import { Observable } from 'rxjs';
import { map, filter, scan } from 'rxjs/operators';

/**
 * Creates a new sorted array from a new change.
 * @param combined
 * @param change
 */
export function combineChange<T>(
  combined: firestore.DocumentChange[], change: firestore.DocumentChange
): firestore.DocumentChange[] {
  switch (change.type) {
    case 'added':
      if (combined[change.newIndex] && combined[change.newIndex].doc.id == change.doc.id) {
        // Not sure why the duplicates are getting fired
      } else {
        combined.splice(change.newIndex, 0, change);
      }
      break;
    case 'modified':
      // When an item changes position we first remove it
      // and then add it's new position
      if (change.oldIndex !== change.newIndex) {
        combined.splice(change.oldIndex, 1);
        combined.splice(change.newIndex, 0, change);
      } else {
        combined.splice(change.newIndex, 1, change);
      }
      break;
    case 'removed':
      combined.splice(change.oldIndex, 1);
      break;
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
export function combineChanges<T>(
  current: firestore.DocumentChange[], changes: firestore.DocumentChange[],
  events: firestore.DocumentChangeType[]
) {
  changes.forEach(change => {
    // skip unwanted change types
    if (events.indexOf(change.type) > -1) {
      current = combineChange(current, change);
    }
  });
  return current;
}


/**
 * Return a stream of document changes on a query. These results are not in sort order but in
 * order of occurence.
 * @param query
 */
export function docChanges(query: firestore.Query) {
  return fromCollectionRef(query)
    .pipe(
      map(snapshot => snapshot.docChanges())
    );
}

/**
 * Return a stream of document changes on a query. These results are in sort order.
 * @param query
 */
export function docs(query: firestore.Query, events: firestore.DocumentChangeType[]) {
  return fromCollectionRef(query)
    .pipe(
      map(changes => changes.docs[0])
    );
}

/**
 * Return a stream of document changes on a query. These results are in sort order.
 * @param query
 */
export function sortedChanges(
  query: firestore.Query, events: firestore.DocumentChangeType[]
) {
  return fromCollectionRef(query)
    .pipe(
      map(changes => changes.docChanges()),
      scan((
        current: firestore.DocumentChange[], changes: firestore.DocumentChange[]
      ) => combineChanges(current, changes, events), [])
    );
}

/**
 * Listen to the latest change in the stream. This method returns changes
 * as they occur and they are not sorted by query order. This allows you to construct
 * your own data structure.
 */
export function stateChanges(
  query: firestore.Query, events?: firestore.DocumentChangeType[]
) {
  if (!events || events.length === 0) {
    return docChanges(query);
  }
  return docChanges(query)
    .pipe(
      map(actions => actions.filter(change => events.indexOf(change.type) > -1)),
      filter(changes => changes.length > 0)
    );
}

/**
 * Create a stream of changes as they occur it time. This method is similar to stateChanges()
 * but it collects each event in an array over time.
 */
export function auditTrail(
  query: firestore.Query, events?: firestore.DocumentChangeType[]
) {
  return stateChanges(query, events)
    .pipe(scan((current, action) => [...current, ...action], []));
}

import { firestore } from 'firebase/app';
import { fromCollectionRef } from '../fromRef';
import { Observable } from 'rxjs';
import { map, filter, scan, distinctUntilChanged } from 'rxjs/operators';

const ALL_EVENTS: firestore.DocumentChangeType[] = [
  'added',
  'modified',
  'removed'
];

const changesFilter = (events?: firestore.DocumentChangeType[]) =>
  map((changes: firestore.DocumentChange[]) => {
    return changes.filter(change => events.indexOf(change.type) > -1);
  });

const filterEmpty = filter(
  (changes: firestore.DocumentChange[]) => changes.length > 0
);

/**
 * Creates a new sorted array from a new change.
 * @param combined
 * @param change
 */
function combineChange<T>(
  combined: firestore.DocumentChange[],
  change: firestore.DocumentChange
): firestore.DocumentChange[] {
  switch (change.type) {
    case 'added':
      if (
        combined[change.newIndex] &&
        combined[change.newIndex].doc.id == change.doc.id
      ) {
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
function combineChanges<T>(
  current: firestore.DocumentChange[],
  changes: firestore.DocumentChange[],
  events: firestore.DocumentChangeType[] = ALL_EVENTS
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
export function docChanges(
  query: firestore.Query,
  events: firestore.DocumentChangeType[] = ALL_EVENTS
) {
  return fromCollectionRef(query).pipe(
    map(snapshot => snapshot.docChanges()),
    changesFilter(events),
    filterEmpty
  );
}

/**
 * Return a stream of document changes on a query. These results are in sort order.
 * @param query
 */
export function collection(query: firestore.Query) {
  return fromCollectionRef(query).pipe(map(changes => changes.docs));
}

/**
 * Return a stream of document changes on a query. These results are in sort order.
 * @param query
 */
export function sortedChanges(
  query: firestore.Query,
  events?: firestore.DocumentChangeType[]
) {
  return fromCollectionRef(query).pipe(
    map(changes => changes.docChanges()),
    scan(
      (
        current: firestore.DocumentChange[],
        changes: firestore.DocumentChange[]
      ) => combineChanges(current, changes, events),
      []
    ),
    filterEmpty
  );
}

/**
 * Create a stream of changes as they occur it time. This method is similar
 * to stateChanges() but it collects each event in an array over time.
 */
export function auditTrail(
  query: firestore.Query,
  events?: firestore.DocumentChangeType[]
): Observable<firestore.DocumentChange[]> {
  return docChanges(query, events).pipe(
    scan((current, action) => [...current, ...action], [])
  );
}

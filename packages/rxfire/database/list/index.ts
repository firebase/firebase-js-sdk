import { database } from 'firebase';
import { ChildEvent, SnapshotPrevKey } from '../interfaces';
import { Observable, of, merge } from 'rxjs';
import { validateEventsArray, isNil } from '../utils';
import { fromRef } from '../fromRef';
import { switchMap, scan, distinctUntilChanged } from 'rxjs/operators';

export function stateChanges(query: database.Query, events?: ChildEvent[]) {
  events = validateEventsArray(events);
  const childEvent$ = events.map(event => fromRef(query, event));
  return merge(...childEvent$);
}

export function list(query: database.Query, events?: ChildEvent[]): Observable<SnapshotPrevKey[]> {
  events = validateEventsArray(events);
  return fromRef(query, 'value', 'once').pipe(
    switchMap(change => {
      const childEvent$ = [of(change)];
      events.forEach(event => childEvent$.push(fromRef(query, event)));
      return merge(...childEvent$).pipe(scan(buildView, []))
    }),
    distinctUntilChanged()
  );
}

function positionFor<T>(changes: SnapshotPrevKey[], key) {
  const len = changes.length;
  for(let i=0; i<len; i++) {
    if(changes[i].snapshot.key === key) {
      return i;
    }
  }
  return -1;
}

function positionAfter<T>(changes: SnapshotPrevKey[], prevKey?: string) {
  if(isNil(prevKey)) { 
    return 0; 
  } else {
    const i = positionFor(changes, prevKey);
    if( i === -1) {
      return changes.length;
    } else {
      return i + 1;
    }
  }
}

function buildView(current: SnapshotPrevKey[], change: SnapshotPrevKey) {
  const { snapshot, prevKey, event } = change; 
  const { key } = snapshot;
  const currentKeyPosition = positionFor(current, key);
  const afterPreviousKeyPosition = positionAfter(current, prevKey);
  switch (event) {
    case 'value':
      if (change.snapshot && change.snapshot.exists()) {
        let prevKey = null;
        change.snapshot.forEach(snapshot => {
          const action: SnapshotPrevKey = { snapshot, event: 'value', prevKey };
          prevKey = snapshot.key;
          current = [...current, action];
          return false;
        });
      }
      return current;
    case 'child_added':
      if (currentKeyPosition > -1) {
        // check that the previouskey is what we expect, else reorder
        const previous = current[currentKeyPosition - 1];
        if ((previous && previous.snapshot.key || null) != prevKey) {
          current = current.filter(x => x.snapshot.key !== snapshot.key);
          current.splice(afterPreviousKeyPosition, 0, change);
        }
      } else if (prevKey == null) {
        return [change, ...current];
      } else {
        current = current.slice()
        current.splice(afterPreviousKeyPosition, 0, change);
      }
      return current;
    case 'child_removed':
      return current.filter(x => x.snapshot.key !== snapshot.key);
    case 'child_changed':
      return current.map(x => x.snapshot.key === key ? change : x);
    case 'child_moved':
      if(currentKeyPosition > -1) {
        const data = current.splice(currentKeyPosition, 1)[0];
        current = current.slice()
        current.splice(afterPreviousKeyPosition, 0, data);
        return current;
      }
      return current;
    // default will also remove null results
    default:
      return current;
  }
}

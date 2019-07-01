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

import { database } from 'firebase';
import { QueryChange, ListenEvent } from '../interfaces';
import { Observable, of, merge, from } from 'rxjs';
import { validateEventsArray } from '../utils';
import { fromRef } from '../fromRef';
import { switchMap, scan, distinctUntilChanged, map } from 'rxjs/operators';
import { changeToData } from '../object';

export function stateChanges(
  query: database.Query,
  events?: ListenEvent[]
): Observable<QueryChange> {
  events = validateEventsArray(events);
  const childEvent$ = events.map(event => fromRef(query, event));
  return merge(...childEvent$);
}

function fromOnce(query: database.Query): Observable<QueryChange> {
  return from(query.once(ListenEvent.value)).pipe(
    map(snapshot => {
      const event = ListenEvent.value;
      return { snapshot, prevKey: null, event };
    })
  );
}

export function list(
  query: database.Query,
  events?: ListenEvent[]
): Observable<QueryChange[]> {
  const eventsList = validateEventsArray(events);
  return fromOnce(query).pipe(
    switchMap(change => {
      const childEvent$ = [of(change)];
      for (const event of eventsList) {
        childEvent$.push(fromRef(query, event));
      }
      return merge(...childEvent$).pipe(scan(buildView, []));
    }),
    distinctUntilChanged()
  );
}

/**
 * Get an object mapped to its value, and optionally its key
 * @param query object ref or query
 * @param keyField map the object key to a specific field
 */
export function listVal<T>(
  query: database.Query,
  keyField?: string
): Observable<T[]> {
  return list(query).pipe(
    map(arr => arr.map(change => changeToData(change, keyField) as T))
  );
}

function positionFor(changes: QueryChange[], key: string | null): number {
  const len = changes.length;
  for (let i = 0; i < len; i++) {
    if (changes[i].snapshot.key === key) {
      return i;
    }
  }
  return -1;
}

function positionAfter(changes: QueryChange[], prevKey?: string): number {
  if (prevKey == null) {
    return 0;
  } else {
    const i = positionFor(changes, prevKey);
    if (i === -1) {
      return changes.length;
    } else {
      return i + 1;
    }
  }
}

function buildView(current: QueryChange[], change: QueryChange): QueryChange[] {
  const { snapshot, prevKey, event } = change;
  const { key } = snapshot;
  const currentKeyPosition = positionFor(current, key);
  const afterPreviousKeyPosition = positionAfter(current, prevKey || undefined);
  switch (event) {
    case ListenEvent.value:
      if (change.snapshot && change.snapshot.exists()) {
        let prevKey: string | null = null;
        change.snapshot.forEach(snapshot => {
          const action: QueryChange = {
            snapshot,
            event: ListenEvent.value,
            prevKey
          };
          prevKey = snapshot.key;
          current = [...current, action];
          return false;
        });
      }
      return current;
    case ListenEvent.added:
      if (currentKeyPosition > -1) {
        // check that the previouskey is what we expect, else reorder
        const previous = current[currentKeyPosition - 1];
        if (((previous && previous.snapshot.key) || null) !== prevKey) {
          current = current.filter(x => x.snapshot.key !== snapshot.key);
          current.splice(afterPreviousKeyPosition, 0, change);
        }
      } else if (prevKey == null) {
        return [change, ...current];
      } else {
        current = current.slice();
        current.splice(afterPreviousKeyPosition, 0, change);
      }
      return current;
    case ListenEvent.removed:
      return current.filter(x => x.snapshot.key !== snapshot.key);
    case ListenEvent.changed:
      return current.map(x => (x.snapshot.key === key ? change : x));
    case ListenEvent.moved:
      if (currentKeyPosition > -1) {
        const data = current.splice(currentKeyPosition, 1)[0];
        current = current.slice();
        current.splice(afterPreviousKeyPosition, 0, data);
        return current;
      }
      return current;
    // default will also remove null results
    default:
      return current;
  }
}

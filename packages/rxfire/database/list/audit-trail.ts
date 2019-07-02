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
import { Observable } from 'rxjs';
import { QueryChange, ListenEvent } from '../interfaces';
import { fromRef } from '../fromRef';
import { map, withLatestFrom, scan, skipWhile } from 'rxjs/operators';
import { stateChanges } from './index';

interface LoadedMetadata {
  data: QueryChange;
  lastKeyToLoad: unknown;
}

export function auditTrail(
  query: database.Query,
  events?: ListenEvent[]
): Observable<QueryChange[]> {
  const auditTrail$ = stateChanges(query, events).pipe(
    scan<QueryChange, QueryChange[]>(
      (current, changes) => [...current, changes],
      []
    )
  );
  return waitForLoaded(query, auditTrail$);
}

function loadedData(query: database.Query): Observable<LoadedMetadata> {
  // Create an observable of loaded values to retrieve the
  // known dataset. This will allow us to know what key to
  // emit the "whole" array at when listening for child events.
  return fromRef(query, ListenEvent.value).pipe(
    map(data => {
      // Store the last key in the data set
      let lastKeyToLoad;
      // Loop through loaded dataset to find the last key
      data.snapshot.forEach(child => {
        lastKeyToLoad = child.key;
        return false;
      });
      // return data set and the current last key loaded
      return { data, lastKeyToLoad };
    })
  );
}

function waitForLoaded(
  query: database.Query,
  snap$: Observable<QueryChange[]>
): Observable<QueryChange[]> {
  const loaded$ = loadedData(query);
  return loaded$.pipe(
    withLatestFrom(snap$),
    // Get the latest values from the "loaded" and "child" datasets
    // We can use both datasets to form an array of the latest values.
    map(([loaded, changes]) => {
      // Store the last key in the data set
      const lastKeyToLoad = loaded.lastKeyToLoad;
      // Store all child keys loaded at this point
      const loadedKeys = changes.map(change => change.snapshot.key);
      return { changes, lastKeyToLoad, loadedKeys };
    }),
    // This is the magical part, only emit when the last load key
    // in the dataset has been loaded by a child event. At this point
    // we can assume the dataset is "whole".
    skipWhile(
      meta =>
        meta.loadedKeys.indexOf(meta.lastKeyToLoad as string | null) === -1
    ),
    // Pluck off the meta data because the user only cares
    // to iterate through the snapshots
    map(meta => meta.changes)
  );
}

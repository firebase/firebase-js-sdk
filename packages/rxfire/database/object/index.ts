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
import { fromRef } from '../fromRef';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Get the snapshot changes of an object
 * @param query
 */
export function object(query: database.Query): Observable<QueryChange> {
  return fromRef(query, ListenEvent.value);
}

/**
 * Get an array of object values, optionally with a mapped key
 * @param query object ref or query
 * @param keyField map the object key to a specific field
 */
export function objectVal<T>(
  query: database.Query,
  keyField?: string
): Observable<T> {
  return fromRef(query, ListenEvent.value).pipe(
    map(change => changeToData(change, keyField) as T)
  );
}

export function changeToData(change: QueryChange, keyField?: string): {} {
  return {
    ...change.snapshot.val(),
    ...(keyField ? { [keyField]: change.snapshot.key } : null)
  };
}

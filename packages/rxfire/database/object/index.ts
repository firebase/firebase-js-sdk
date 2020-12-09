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

import firebase from 'firebase';
import { QueryChange, ListenEvent } from '../interfaces';
import { fromRef } from '../fromRef';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type Query = firebase.database.Query;
/**
 * Get the snapshot changes of an object
 * @param query
 */
export function object(query: Query): Observable<QueryChange> {
  return fromRef(query, ListenEvent.value);
}

/**
 * Get an array of object values, optionally with a mapped key
 * @param query object ref or query
 * @param keyField map the object key to a specific field
 */
export function objectVal<T>(query: Query, keyField?: string): Observable<T> {
  return fromRef(query, ListenEvent.value).pipe(
    map(change => changeToData(change, keyField) as T)
  );
}

export function changeToData(change: QueryChange, keyField?: string): {} {
  const val = change.snapshot.val();

  // val can be a primitive type
  if (typeof val !== 'object') {
    return val;
  }

  return {
    ...val,
    ...(keyField ? { [keyField]: change.snapshot.key } : null)
  };
}

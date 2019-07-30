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
import { fromDocRef } from '../fromRef';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export function doc(
  ref: firestore.DocumentReference
): Observable<firestore.DocumentSnapshot> {
  return fromDocRef(ref);
}

/**
 * Returns a stream of a document, mapped to its data payload and optionally the document ID
 * @param query
 */
export function docData<T>(
  ref: firestore.DocumentReference,
  idField?: string
): Observable<T> {
  return doc(ref).pipe(map(snap => snapToData(snap, idField) as T));
}

export function snapToData(
  snapshot: firestore.DocumentSnapshot,
  idField?: string
): {} {
  return {
    ...snapshot.data(),
    ...(idField ? { [idField]: snapshot.id } : null)
  };
}

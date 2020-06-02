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

import { firestore } from 'firebase/app';
import { Observable } from 'rxjs';

/* eslint-disable @typescript-eslint/no-explicit-any */
function _fromRef(
  ref: any,
  options: firestore.SnapshotListenOptions | undefined
): Observable<any> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new Observable(subscriber => {
    const unsubscribe = ref.onSnapshot(options || {}, subscriber);
    return { unsubscribe };
  });
}

export function fromRef(
  ref: firestore.DocumentReference | firestore.Query,
  options?: firestore.SnapshotListenOptions
): Observable<{}> {
  return _fromRef(ref, options);
}

export function fromDocRef(
  ref: firestore.DocumentReference,
  options?: firestore.SnapshotListenOptions
): Observable<firestore.DocumentSnapshot> {
  return fromRef(ref, options) as Observable<firestore.DocumentSnapshot>;
}

export function fromCollectionRef(
  ref: firestore.Query,
  options?: firestore.SnapshotListenOptions
): Observable<firestore.QuerySnapshot> {
  return fromRef(ref, options) as Observable<firestore.QuerySnapshot>;
}

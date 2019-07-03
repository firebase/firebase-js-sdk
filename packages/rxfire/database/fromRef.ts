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
import { delay } from 'rxjs/operators';
import { ListenEvent, QueryChange } from './interfaces';

/**
 * Create an observable from a Database Reference or Database Query.
 * @param ref Database Reference
 * @param event Listen event type ('value', 'added', 'changed', 'removed', 'moved')
 */
export function fromRef(
  ref: database.Query,
  event: ListenEvent
): Observable<QueryChange> {
  return new Observable<QueryChange>(subscriber => {
    const fn = ref.on(
      event,
      (snapshot, prevKey) => {
        subscriber.next({ snapshot, prevKey, event });
      },
      subscriber.error.bind(subscriber)
    );
    return {
      unsubscribe() {
        ref.off(event, fn);
      }
    };
  }).pipe(
    // Ensures subscribe on observable is async. This handles
    // a quirk in the SDK where on/once callbacks can happen
    // synchronously.
    delay(0)
  );
}

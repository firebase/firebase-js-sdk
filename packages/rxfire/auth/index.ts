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

// auth is used as a namespace to access types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { auth, User } from 'firebase';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * Create an observable of authentication state. The observer is only
 * triggered on sign-in or sign-out.
 * @param auth firebase.auth.Auth
 */
export function authState(auth: auth.Auth): Observable<User> {
  return new Observable(subscriber => {
    const unsubscribe = auth.onAuthStateChanged(subscriber);
    return { unsubscribe };
  });
}

/**
 * Create an observable of user state. The observer is triggered for sign-in,
 * sign-out, and token refresh events
 * @param auth firebase.auth.Auth
 */
export function user(auth: auth.Auth): Observable<User> {
  return new Observable(subscriber => {
    const unsubscribe = auth.onIdTokenChanged(subscriber);
    return { unsubscribe };
  });
}

/**
 * Create an observable of idToken state. The observer is triggered for sign-in,
 * sign-out, and token refresh events
 * @param auth firebase.auth.Auth
 */
export function idToken(auth: auth.Auth): Observable<string | null> {
  return user(auth).pipe(
    switchMap(user => (user ? from(user.getIdToken()) : of(null)))
  );
}

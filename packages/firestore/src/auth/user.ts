/**
 * @license
 * Copyright 2017 Google LLC
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

/**
 * Simple wrapper around a nullable UID. Mostly exists to make code more
 * readable.
 */
export class User {
  /** A user with a null UID. */
  static readonly UNAUTHENTICATED = new User(null);

  // TODO(mikelehen): Look into getting a proper uid-equivalent for
  // non-FirebaseAuth providers.
  static readonly GOOGLE_CREDENTIALS = new User('google-credentials-uid');
  static readonly FIRST_PARTY = new User('first-party-uid');
  static readonly MOCK_USER = new User('mock-user');

  constructor(readonly uid: string | null) {}

  isAuthenticated(): boolean {
    return this.uid != null;
  }

  /**
   * Returns a key representing this user, suitable for inclusion in a
   * dictionary.
   */
  toKey(): string {
    if (this.isAuthenticated()) {
      return 'uid:' + this.uid;
    } else {
      return 'anonymous-user';
    }
  }

  isEqual(otherUser: User): boolean {
    return otherUser.uid === this.uid;
  }
}

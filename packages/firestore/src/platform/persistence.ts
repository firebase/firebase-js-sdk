/**
 * @license
 * Copyright 2020 Google Inc.
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

import { FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { clearPersistence, enablePersistence } from '../api/persistence';

/**
 * Patches the Firestore prototype and provides the backing implementations for
 * `Firestore.enablePersistence()` and `Firestore.clearPersistence()`.
 */
export function registerFirestorePersistence(
  firebase: FirebaseNamespace
): void {
  (firebase as _FirebaseNamespace).INTERNAL.extendNamespace({
    firestore: {
      Firestore: {
        prototype: {
          enablePersistence,
          clearPersistence
        }
      }
    }
  });
}

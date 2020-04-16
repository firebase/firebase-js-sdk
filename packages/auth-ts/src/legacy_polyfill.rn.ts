/**
 * @license
 * Copyright 2019 Google Inc.
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

import { browserSessionPersistence } from './core/persistence/browser_session';
import { indexedDBLocalPersistence } from './core/persistence/indexed_db';
import { browserLocalPersistence } from './core/persistence/browser_local';
import { createPolyfill, firebaseApp } from './create_polyfill';
import { reactNativeLocalPersistence } from './core/persistence/react_local';

firebaseApp.auth = createPolyfill({
  persistence: [reactNativeLocalPersistence, indexedDBLocalPersistence]
});

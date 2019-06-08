/**
 * @license
 * Copyright 2017 Google Inc.
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

import { configureForStandalone } from '../config';

/* eslint-disable camelcase */

/**
 * Magic variable that is used to export the Firestore namespace.
 *
 * A wrapping script should include this file and additionally make sure
 * __firestore_exports__ is defined in scope when including this file. After
 * the including this file, __firestore_exports__ will then hold the Firestore
 * namespace.
 *
 * Note that name was chosen arbitrarily but was intended to not conflict with
 * any other variable in scope.
 */
declare let __firestore_exports__: { [key: string]: {} };

if (typeof __firestore_exports__ !== 'undefined') {
  configureForStandalone(__firestore_exports__);
} else {
  // Wrap in a closure to allow throwing from within a goog.module.
  // TS compiles this file to a goog.module which then disallows throwing
  // directly.
  (() => {
    throw new Error('__firestore_exports__ not found.');
  })();
}

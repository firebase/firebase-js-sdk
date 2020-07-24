/**
 * @license
 * Copyright 2019 Google LLC
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

// TODO(mrschmidt): Once imported into Google3, fix
// third_party/javascript/firebase/src/packages/firestore/tools/console.build.js

export { Firestore, FirestoreDatabase } from './src/api/database';
export {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot
} from './src/api/database';
export { Blob } from './src/api/blob';
export { GeoPoint } from './src/api/geo_point';
export { FirstPartyCredentialsSettings } from './src/api/credentials';
export { FieldPath } from './src/api/field_path';
export { FieldValue } from './src/api/field_value';
export { Timestamp } from './src/api/timestamp';

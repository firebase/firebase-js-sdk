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

import './src/platform_browser/browser_init';

export { Firestore, FirestoreDatabase } from './src/api/database';
export {
  PublicCollectionReference as CollectionReference,
  PublicDocumentReference as DocumentReference,
  PublicDocumentSnapshot as DocumentSnapshot,
  PublicQuerySnapshot as QuerySnapshot,
  PublicFieldValue as FieldValue,
  PublicBlob as Blob
} from './src/platform/config';
export { GeoPoint } from './src/api/geo_point';
export { FirstPartyCredentialsSettings } from './src/api/credentials';
export { FieldPath } from './src/api/field_path';
export { Timestamp } from './src/api/timestamp';

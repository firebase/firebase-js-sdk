/**
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

 /**
  * The firestore console team have a special set of exports that they need to
  * build the console for firestore. This is those exports.
  * 
  * We leverage the `webpack.config.js` in the `gulpfile.js` to build and wrap
  * this output in the shape that we need it.
  */

import './src/platform_browser/browser_init';

export {
  Firestore,
  FirestoreDatabase,
  PublicCollectionReference as CollectionReference,
  PublicDocumentReference as DocumentReference,
  PublicDocumentSnapshot as DocumentSnapshot,
  PublicQuerySnapshot as QuerySnapshot,
  PrivateSettings
} from './src/api/database';
export { GeoPoint } from './src/api/geo_point';
export { PublicBlob as Blob } from './src/api/blob';
export { FirstPartyCredentialsSettings } from './src/api/credentials';
export { PublicFieldValue as FieldValue } from './src/api/field_value';
export { FieldPath } from './src/api/field_path';
export {
  DocumentListenOptions,
  DocumentChange,
  DocumentData
} from '@firebase/firestore-types';

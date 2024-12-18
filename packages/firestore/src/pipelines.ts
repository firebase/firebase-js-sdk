/**
 * Cloud Firestore
 *
 * @packageDocumentation
 */

/**
 * @license
 * Copyright 2024 Google LLC
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

// External exports: ./api
// These external exports will be stripped from the dist/pipelines.d.ts file
// by the prune-dts script, in order to reduce type duplication. However, these
// types need to be exported here to ensure that api-extractor behaves
// correctly. If a type from api.ts is missing from this export, then
// api-extractor may rename it with a suffix `_#`, e.g. `YourType_2`.
export type {
  Timestamp,
  DocumentReference,
  VectorValue,
  GeoPoint,
  FieldPath,
  DocumentData,
  Query,
  Firestore,
  FirestoreDataConverter,
  WithFieldValue,
  PartialWithFieldValue,
  SetOptions,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Primitive,
  FieldValue,
  SnapshotMetadata
} from './api';

export * from './api_pipelines';

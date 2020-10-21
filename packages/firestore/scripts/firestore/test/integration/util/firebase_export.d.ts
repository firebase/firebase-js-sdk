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
import * as firestore from '@firebase/firestore-types';
import { FirebaseApp as FirebaseAppShim } from '../../../exp/test/shim';
import { FirebaseApp } from '@firebase/app-types';
/**
 * Detects whether we are running against the functionial (tree-shakeable)
 * Firestore API. Used to exclude some tests, e.g. those that validate invalid
 * TypeScript input.
 */
export declare function usesFunctionalApi(): boolean;
/**
 * Creates a new test instance of Firestore using either firebase.firestore()
 * or `initializeFirestore` from the modular API.
 */
export declare function newTestFirestore(projectId: string, nameOrApp?: string | FirebaseApp | FirebaseAppShim, settings?: firestore.Settings): firestore.FirebaseFirestore;
declare const Firestore: any;
declare const FieldPath: any;
declare const Timestamp: any;
declare const GeoPoint: any;
declare const FieldValue: any;
declare const Blob: any;
export { Firestore, FieldValue, FieldPath, Timestamp, Blob, GeoPoint };

/**
 * @license
 * Copyright 2020 Google LLC
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
import { Datastore } from '../../../src/remote/datastore';
import { FirebaseFirestore } from './database';
export declare const LOG_TAG = "ComponentProvider";
export declare const DEFAULT_HOST = "firestore.googleapis.com";
export declare const DEFAULT_SSL = true;
/**
 * Returns an initialized and started Datastore for the given Firestore
 * instance. Callers must invoke removeDatastore() when the Firestore
 * instance is terminated.
 */
export declare function getDatastore(firestore: FirebaseFirestore): Datastore;
/**
 * Removes all components associated with the provided instance. Must be called
 * when the `Firestore` instance is terminated.
 */
export declare function removeComponents(firestore: FirebaseFirestore): void;

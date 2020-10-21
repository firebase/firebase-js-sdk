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
import { FirebaseFirestore } from './database';
import { OfflineComponentProvider, OnlineComponentProvider } from '../../../src/core/component_provider';
import { LocalStore } from '../../../src/local/local_store';
import { RemoteStore } from '../../../src/remote/remote_store';
import { SyncEngine } from '../../../src/core/sync_engine';
import { Persistence } from '../../../src/local/persistence';
import { EventManager } from '../../../src/core/event_manager';
export declare function setOfflineComponentProvider(firestore: FirebaseFirestore, offlineComponentProvider: OfflineComponentProvider): Promise<void>;
export declare function setOnlineComponentProvider(firestore: FirebaseFirestore, onlineComponentProvider: OnlineComponentProvider): Promise<void>;
export declare function getSyncEngine(firestore: FirebaseFirestore): Promise<SyncEngine>;
export declare function getRemoteStore(firestore: FirebaseFirestore): Promise<RemoteStore>;
export declare function getEventManager(firestore: FirebaseFirestore): Promise<EventManager>;
export declare function getPersistence(firestore: FirebaseFirestore): Promise<Persistence>;
export declare function getLocalStore(firestore: FirebaseFirestore): Promise<LocalStore>;
/**
 * Removes all components associated with the provided instance. Must be called
 * when the Firestore instance is terminated.
 */
export declare function removeComponents(firestore: FirebaseFirestore): Promise<void>;

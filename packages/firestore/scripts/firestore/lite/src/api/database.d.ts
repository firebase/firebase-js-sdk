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
import { _FirebaseService, FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';
import { DatabaseId } from '../../../src/core/database_info';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { CredentialsProvider } from '../../../src/api/credentials';
declare module '@firebase/component' {
    interface NameServiceMapping {
        'firestore/lite': FirebaseFirestore;
    }
}
export interface Settings {
    host?: string;
    ssl?: boolean;
    ignoreUndefinedProperties?: boolean;
}
/**
 * The Cloud Firestore service interface.
 *
 * Do not call this constructor directly. Instead, use {@link getFirestore()}.
 */
export declare class FirebaseFirestore implements _FirebaseService {
    readonly _databaseId: DatabaseId;
    readonly _credentials: CredentialsProvider;
    readonly _persistenceKey: string;
    protected _settings?: Settings;
    private _settingsFrozen;
    private _terminateTask?;
    /**
     * The {@link FirebaseApp app} associated with this `Firestore` service
     * instance.
     */
    readonly app: FirebaseApp;
    constructor(app: FirebaseApp, authProvider: Provider<FirebaseAuthInternalName>);
    get _initialized(): boolean;
    get _terminated(): boolean;
    _configureClient(settings: Settings): void;
    _getSettings(): Settings;
    private static _databaseIdFromApp;
    _delete(): Promise<void>;
    /**
     * Terminates all components used by this client. Subclasses can override
     * this method to clean up their own dependencies, but must also call this
     * method.
     *
     * Only ever called once.
     */
    protected _terminate(): Promise<void>;
}
/**
 * Initializes a new instance of Cloud Firestore with the provided settings.
 * Can only be called before any other functions, including
 * {@link getFirestore()}. If the custom settings are empty, this function is
 * equivalent to calling {@link getFirestore()}.
 *
 * @param app The {@link FirebaseApp} with which the `Firestore` instance will be
 * associated.
 * @param settings A settings object to configure the `Firestore` instance.
 * @return A newly initialized Firestore instance.
 */
export declare function initializeFirestore(app: FirebaseApp, settings: Settings): FirebaseFirestore;
/**
 * Returns the existing instance of Firestore that is associated with the
 * provided {@link FirebaseApp}. If no instance exists, initializes a new
 * instance with default settings.
 *
 * @param app The {@link FirebaseApp} instance that the returned Firestore
 * instance is associated with.
 * @return The `Firestore` instance of the provided app.
 */
export declare function getFirestore(app: FirebaseApp): FirebaseFirestore;
/**
 * Terminates the provided Firestore instance.
 *
 * After calling `terminate()` only the `clearIndexedDbPersistence()` functions
 * may be used. Any other function will throw a `FirestoreError`. Termination
 * does not cancel any pending writes, and any promises that are awaiting a
 * response from the server will not be resolved.
 *
 * To restart after termination, create a new instance of FirebaseFirestore with
 * {@link getFirestore()}.
 *
 * Note: Under normal circumstances, calling `terminate()` is not required. This
 * function is useful only when you want to force this instance to release all of
 * its resources or in combination with {@link clearIndexedDbPersistence()} to
 * ensure that all local state is destroyed between test runs.
 *
 * @return A promise that is resolved when the instance has been successfully
 * terminated.
 */
export declare function terminate(firestore: FirebaseFirestore): Promise<void>;

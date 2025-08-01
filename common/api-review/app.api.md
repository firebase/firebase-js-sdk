## API Report File for "@firebase/app"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { Component } from '@firebase/component';
import { ComponentContainer } from '@firebase/component';
import { FirebaseError } from '@firebase/util';
import { LogCallback } from '@firebase/logger';
import { LogLevelString } from '@firebase/logger';
import { LogOptions } from '@firebase/logger';
import { Name } from '@firebase/component';
import { Provider } from '@firebase/component';

// @internal (undocumented)
export function _addComponent<T extends Name>(app: FirebaseApp, component: Component<T>): void;

// @internal (undocumented)
export function _addOrOverwriteComponent(app: FirebaseApp, component: Component): void;

// @internal (undocumented)
export const _apps: Map<string, FirebaseApp>;

// @internal
export function _clearComponents(): void;

// @internal
export const _components: Map<string, Component<any>>;

// @internal
export const _DEFAULT_ENTRY_NAME = "[DEFAULT]";

// @public
export function deleteApp(app: FirebaseApp): Promise<void>;

// @public
export interface FirebaseApp {
    automaticDataCollectionEnabled: boolean;
    readonly name: string;
    readonly options: FirebaseOptions;
}

// @internal (undocumented)
export interface _FirebaseAppInternal extends FirebaseApp {
    // (undocumented)
    checkDestroyed(): void;
    // (undocumented)
    container: ComponentContainer;
    // (undocumented)
    isDeleted: boolean;
}

// @public
export interface FirebaseAppSettings {
    automaticDataCollectionEnabled?: boolean;
    name?: string;
}

export { FirebaseError }

// @public
export interface FirebaseOptions {
    apiKey?: string;
    appId?: string;
    authDomain?: string;
    databaseURL?: string;
    measurementId?: string;
    messagingSenderId?: string;
    projectId?: string;
    storageBucket?: string;
}

// @public
export interface FirebaseServerApp extends FirebaseApp {
    name: string;
    readonly settings: FirebaseServerAppSettings;
}

// @public
export interface FirebaseServerAppSettings extends Omit<FirebaseAppSettings, 'name'> {
    appCheckToken?: string;
    authIdToken?: string;
    releaseOnDeref?: object;
}

// @internal (undocumented)
export interface _FirebaseService {
    // (undocumented)
    app: FirebaseApp;
    _delete(): Promise<void>;
}

// @public
export function getApp(name?: string): FirebaseApp;

// @public
export function getApps(): FirebaseApp[];

// @internal (undocumented)
export function _getProvider<T extends Name>(app: FirebaseApp, name: T): Provider<T>;

// @public
export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;

// @public
export function initializeApp(options: FirebaseOptions, config?: FirebaseAppSettings): FirebaseApp;

// @public
export function initializeApp(): FirebaseApp;

// @public
export function initializeServerApp(options: FirebaseOptions | FirebaseApp, config?: FirebaseServerAppSettings): FirebaseServerApp;

// @public
export function initializeServerApp(config?: FirebaseServerAppSettings): FirebaseServerApp;

// @internal (undocumented)
export function _isFirebaseApp(obj: FirebaseApp | FirebaseOptions | FirebaseAppSettings): obj is FirebaseApp;

// @internal (undocumented)
export function _isFirebaseServerApp(obj: FirebaseApp | FirebaseServerApp | null | undefined): obj is FirebaseServerApp;

// @internal (undocumented)
export function _isFirebaseServerAppSettings(obj: FirebaseApp | FirebaseOptions | FirebaseAppSettings): obj is FirebaseServerAppSettings;

// @public
export function onLog(logCallback: LogCallback | null, options?: LogOptions): void;

// @internal (undocumented)
export function _registerComponent<T extends Name>(component: Component<T>): boolean;

// @public
export function registerVersion(libraryKeyOrName: string, version: string, variant?: string): void;

// @internal (undocumented)
export function _removeServiceInstance<T extends Name>(app: FirebaseApp, name: T, instanceIdentifier?: string): void;

// @public
export const SDK_VERSION: string;

// @internal (undocumented)
export const _serverApps: Map<string, FirebaseServerApp>;

// @public
export function setLogLevel(logLevel: LogLevelString): void;


```

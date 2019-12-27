import { FirebaseAppNext, FirebaseOptionsNext, FirebaseAppConfigNext, FirebaseAppInternalNext } from './types';
import { DEFAULT_ENTRY_NAME } from '../constants';
import { ERROR_FACTORY, AppError } from '../errors';
import { ComponentContainer, Component } from '@firebase/component';
import { version } from '../../../firebase/package.json';

const apps = new Map<string, FirebaseAppNext>();

// Registered components. Private Components only. Public components are not needed any more because
// the public APIs are directly exported from the respective packages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components = new Map<string, Component<any>>();

export const SDK_VERSION = version;

export function initializeApp(
    options: FirebaseOptionsNext,
    config?: FirebaseAppConfigNext
): FirebaseAppNext;
export function initializeApp(
    options: FirebaseOptionsNext,
    name?: string): FirebaseAppNext;
export function initializeApp(
    options: FirebaseOptionsNext,
    rawConfig = {}
): FirebaseAppNext {
    if (typeof rawConfig !== 'object') {
        const name = rawConfig;
        rawConfig = { name };
    }

    const config = rawConfig as FirebaseAppConfigNext;

    if (config.name === undefined) {
        config.name = DEFAULT_ENTRY_NAME;
    }

    const { name, automaticDataCollectionEnabled } = config;

    if (typeof name !== 'string' || !name) {
        throw ERROR_FACTORY.create(AppError.BAD_APP_NAME, {
            appName: String(name)
        });
    }

    if (apps.has(name)) {
        throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: name });
    }

    const container = new ComponentContainer(name);
    for (const component of components.values()) {
        container.addComponent(component);
    }
    
    const newApp: FirebaseAppInternalNext = {
        name,
        options,
        automaticDataCollectionEnabled: automaticDataCollectionEnabled ?? false,
        container
    };

    apps.set(name, newApp);

    return newApp;
}

export function getApp(name: string = DEFAULT_ENTRY_NAME): FirebaseAppNext {

    const app = apps.get(name);
    if (!app) {
        throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
    }

    return app;
}

export function getApps(): FirebaseAppNext[] {
    return Array.from(apps.values());
}

// What does it mean for other SDKs?
export function deleteApp(): Promise<void> {
    throw Error('Not implemented');
}
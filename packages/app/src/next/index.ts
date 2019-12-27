import { FirebaseAppNext, FirebaseOptionsNext, FirebaseAppConfigNext, FirebaseAppInternalNext } from './types';
import { DEFAULT_ENTRY_NAME } from '../constants';
import { ERROR_FACTORY, AppError } from '../errors';
import { ComponentContainer, Component } from '@firebase/component';
import { version } from '../../../firebase/package.json';
import { FirebaseAppImplNext } from './firebaseApp';

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
    name?: string
): FirebaseAppNext;
export function initializeApp(
    options: FirebaseOptionsNext,
    rawConfig = {}
): FirebaseAppNext {
    if (typeof rawConfig !== 'object') {
        const name = rawConfig;
        rawConfig = { name };
    }

    const config: Required<FirebaseAppConfigNext> = {
        name: DEFAULT_ENTRY_NAME,
        automaticDataCollectionEnabled: false,
        ...rawConfig
    };

    const name = config.name;

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

    const newApp = new FirebaseAppImplNext(options, config, container);

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

export function deleteApp(app: FirebaseAppNext): Promise<void> {

    if (apps.has(app.name)) {
        (app as FirebaseAppInternalNext).isDeleted = true;
        apps.delete(app.name);
        // TODO: what to do with other SDKs?
    }

    return Promise.resolve();
}

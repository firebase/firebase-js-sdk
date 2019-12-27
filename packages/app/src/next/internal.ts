import { FirebaseAppInternalNext } from './types';
import { DEFAULT_ENTRY_NAME } from '../constants';
import { Component } from '@firebase/component';
import { logger } from '../logger';

/**
 * Remove a service instance from the cache, so we will create a new instance for this service
 * when people try to get this service again.
 *
 * NOTE: currently only firestore is using this functionality to support firestore shutdown.
 *
 * @param name The service name
 * @param instanceIdentifier instance identifier in case multiple instances are allowed
 * @internal
 */
export function removeServiceInstance(
    app: FirebaseAppInternalNext,
    name: string,
    instanceIdentifier: string = DEFAULT_ENTRY_NAME
): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.container.getProvider(name as any).clearInstance(instanceIdentifier);
}

/**
 * @param component the component being added to this app's container
 */
export function addComponent(app: FirebaseAppInternalNext, component: Component): void {
    try {
        app.container.addComponent(component);
    } catch(e) {
        logger.debug(
            `Component ${component.name} failed to register with FirebaseApp ${app.name}`,
            e
        );
    }
}

export function addOrOverwriteComponent(app: FirebaseAppInternalNext, component: Component): void {
    app.container.addOrOverwriteComponent(component);
}
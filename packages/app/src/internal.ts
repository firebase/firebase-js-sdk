/**
 * @license
 * Copyright 2019 Google LLC
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

import {
  FirebaseApp,
  FirebaseAppSettings,
  FirebaseServerAppSettings,
  FirebaseOptions,
  FirebaseServerApp
} from './public-types';
import { Component, Provider, Name } from '@firebase/component';
import { logger } from './logger';
import { DEFAULT_ENTRY_NAME } from './constants';
import { FirebaseAppImpl } from './firebaseApp';
import { FirebaseServerAppImpl } from './firebaseServerApp';

/**
 * @internal
 */
export const _apps = new Map<string, FirebaseApp>();

/**
 * @internal
 */
export const _serverApps = new Map<string, FirebaseServerApp>();

/**
 * Registered components.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const _components = new Map<string, Component<any>>();

/**
 * @param component - the component being added to this app's container
 *
 * @internal
 */
export function _addComponent<T extends Name>(
  app: FirebaseApp,
  component: Component<T>
): void {
  try {
    (app as FirebaseAppImpl).container.addComponent(component);
  } catch (e) {
    logger.debug(
      `Component ${component.name} failed to register with FirebaseApp ${app.name}`,
      e
    );
  }
}

/**
 *
 * @internal
 */
export function _addOrOverwriteComponent(
  app: FirebaseApp,
  component: Component
): void {
  (app as FirebaseAppImpl).container.addOrOverwriteComponent(component);
}

/**
 *
 * @param component - the component to register
 * @returns whether or not the component is registered successfully
 *
 * @internal
 */
export function _registerComponent<T extends Name>(
  component: Component<T>
): boolean {
  const componentName = component.name;
  if (_components.has(componentName)) {
    logger.debug(
      `There were multiple attempts to register component ${componentName}.`
    );

    return false;
  }

  _components.set(componentName, component);

  // add the component to existing app instances
  for (const app of _apps.values()) {
    _addComponent(app as FirebaseAppImpl, component);
  }

  for (const serverApp of _serverApps.values()) {
    _addComponent(serverApp as FirebaseServerAppImpl, component);
  }

  return true;
}

/**
 *
 * @param app - FirebaseApp instance
 * @param name - service name
 *
 * @returns the provider for the service with the matching name
 *
 * @internal
 */
export function _getProvider<T extends Name>(
  app: FirebaseApp,
  name: T
): Provider<T> {
  const heartbeatController = (app as FirebaseAppImpl).container
    .getProvider('heartbeat')
    .getImmediate({ optional: true });
  if (heartbeatController) {
    void heartbeatController.triggerHeartbeat();
  }
  return (app as FirebaseAppImpl).container.getProvider(name);
}

/**
 *
 * @param app - FirebaseApp instance
 * @param name - service name
 * @param instanceIdentifier - service instance identifier in case the service supports multiple instances
 *
 * @internal
 */
export function _removeServiceInstance<T extends Name>(
  app: FirebaseApp,
  name: T,
  instanceIdentifier: string = DEFAULT_ENTRY_NAME
): void {
  _getProvider(app, name).clearInstance(instanceIdentifier);
}

/**
 *
 * @param obj - an object of type FirebaseApp, FirebaseOptions or FirebaseAppSettings.
 *
 * @returns true if the provide object is of type FirebaseApp.
 *
 * @internal
 */
export function _isFirebaseApp(
  obj: FirebaseApp | FirebaseOptions | FirebaseAppSettings
): obj is FirebaseApp {
  return (obj as FirebaseApp).options !== undefined;
}

/**
 *
 * @param obj - an object of type FirebaseApp, FirebaseOptions or FirebaseAppSettings.
 *
 * @returns true if the provided object is of type FirebaseServerAppImpl.
 *
 * @internal
 */
export function _isFirebaseServerAppSettings(
  obj: FirebaseApp | FirebaseOptions | FirebaseAppSettings
): obj is FirebaseServerAppSettings {
  if (_isFirebaseApp(obj)) {
    return false;
  }
  return (
    'authIdToken' in obj ||
    'appCheckToken' in obj ||
    'releaseOnDeref' in obj ||
    'automaticDataCollectionEnabled' in obj
  );
}

/**
 *
 * @param obj - an object of type FirebaseApp.
 *
 * @returns true if the provided object is of type FirebaseServerAppImpl.
 *
 * @internal
 */
export function _isFirebaseServerApp(
  obj: FirebaseApp | FirebaseServerApp | null | undefined
): obj is FirebaseServerApp {
  if (obj === null || obj === undefined) {
    return false;
  }
  return (obj as FirebaseServerApp).settings !== undefined;
}

/**
 * Test only
 *
 * @internal
 */
export function _clearComponents(): void {
  _components.clear();
}

/**
 * Exported in order to be used in app-compat package
 */
export { DEFAULT_ENTRY_NAME as _DEFAULT_ENTRY_NAME };

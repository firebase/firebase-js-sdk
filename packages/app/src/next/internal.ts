/**
 * @license
 * Copyright 2019 Google Inc.
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

import { FirebaseAppInternalNext, FirebaseAppNext } from '@firebase/app-types/next';
import { Component } from '@firebase/component';
import { logger } from '../logger';

export const apps = new Map<string, FirebaseAppNext>();

// Registered components. Private Components only. Public components are not needed any more because
// the public APIs are directly exported from the respective packages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const components = new Map<string, Component<any>>();

/**
 * @param component the component being added to this app's container
 */
export function addComponent(
  app: FirebaseAppInternalNext,
  component: Component
): void {
  try {
    app.container.addComponent(component);
  } catch (e) {
    logger.debug(
      `Component ${component.name} failed to register with FirebaseApp ${app.name}`,
      e
    );
  }
}

export function addOrOverwriteComponent(
  app: FirebaseAppInternalNext,
  component: Component
): void {
  app.container.addOrOverwriteComponent(component);
}

/**
 *
 * @param component
 * @returns whether or not the component is registered successfully
 */
export function registerComponent(component: Component): boolean {
  const componentName = component.name;
  if (components.has(componentName)) {
    logger.debug(
      `There were multiple attempts to register component ${componentName}.`
    );

    return false;
  }

  components.set(componentName, component);

  // add the component to existing app instances
  for (const app of apps.values()) {
    addComponent(app as FirebaseAppInternalNext, component);
  }

  return true;
}

/**
 * Test only
 */
export function clearComponents(): void {
  components.clear();
}

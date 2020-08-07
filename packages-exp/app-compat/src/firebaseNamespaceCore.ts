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
  FirebaseOptions,
  FirebaseNamespace
} from '@firebase/app-types'; // TODO: create @firebase/app-types-compat before the official release
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService,
  FirebaseServiceNamespace
} from '@firebase/app-types/private';
import {
  SDK_VERSION,
  initializeApp,
  registerVersion,
  _registerComponent,
  _DEFAULT_ENTRY_NAME
} from '@firebase/app-exp';
import { _FirebaseAppInternal } from '@firebase/app-types-exp';
import { Component, ComponentType } from '@firebase/component';

import { deepExtend, contains } from '@firebase/util';
import { FirebaseAppImpl } from './firebaseApp';
import { ERROR_FACTORY, AppError } from './errors';
import { FirebaseAppLiteImpl } from './lite/firebaseAppLite';

/**
 * Because auth can't share code with other components, we attach the utility functions
 * in an internal namespace to share code.
 * This function return a firebase namespace object without
 * any utility functions, so it can be shared between the regular firebaseNamespace and
 * the lite version.
 */
export function createFirebaseNamespaceCore(
  firebaseAppImpl: typeof FirebaseAppImpl | typeof FirebaseAppLiteImpl
): FirebaseNamespace {
  const apps: { [name: string]: FirebaseApp } = {};
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // const components = new Map<string, Component<any>>();

  // A namespace is a plain JavaScript Object.
  const namespace: FirebaseNamespace = {
    // Hack to prevent Babel from modifying the object returned
    // as the firebase namespace.
    // @ts-ignore
    __esModule: true,
    initializeApp: initializeAppCompat,
    // @ts-ignore
    app,
    registerVersion,
    // @ts-ignore
    apps: null,
    SDK_VERSION,
    INTERNAL: {
      registerComponent: registerComponentCompat,
      removeApp,
      useAsService
    }
  };

  // Inject a circular default export to allow Babel users who were previously
  // using:
  //
  //   import firebase from 'firebase';
  //   which becomes: var firebase = require('firebase').default;
  //
  // instead of
  //
  //   import * as firebase from 'firebase';
  //   which becomes: var firebase = require('firebase');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (namespace as any)['default'] = namespace;

  // firebase.apps is a read-only getter.
  Object.defineProperty(namespace, 'apps', {
    get: getApps
  });

  /**
   * Called by App.delete() - but before any services associated with the App
   * are deleted.
   */
  function removeApp(name: string): void {
    delete apps[name];
  }

  /**
   * Get the App object for a given name (or DEFAULT).
   */
  function app(name?: string): FirebaseApp {
    name = name || _DEFAULT_ENTRY_NAME;
    if (!contains(apps, name)) {
      throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
    }
    return apps[name];
  }

  // @ts-ignore
  app['App'] = firebaseAppImpl;

  /**
   * Create a new App instance (name must be unique).
   */
  function initializeAppCompat(
    options: FirebaseOptions,
    rawConfig = {}
  ): FirebaseApp {
    const app = initializeApp(options, rawConfig) as _FirebaseAppInternal;
    const appCompat = new firebaseAppImpl(app, namespace as _FirebaseNamespace);
    apps[app.name] = appCompat;
    return appCompat;
  }

  /*
   * Return an array of all the non-deleted FirebaseApps.
   */
  function getApps(): FirebaseApp[] {
    // Make a copy so caller cannot mutate the apps list.
    return Object.keys(apps).map(name => apps[name]);
  }

  function registerComponentCompat(
    component: Component
  ): FirebaseServiceNamespace<FirebaseService> | null {
    const componentName = component.name;
    if (
      _registerComponent(component) &&
      component.type === ComponentType.PUBLIC
    ) {
      // create service namespace for public components
      // The Service namespace is an accessor function ...
      const serviceNamespace = (
        appArg: FirebaseApp = app()
      ): FirebaseService => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (appArg as any)[componentName] !== 'function') {
          // Invalid argument.
          // This happens in the following case: firebase.storage('gs:/')
          throw ERROR_FACTORY.create(AppError.INVALID_APP_ARGUMENT, {
            appName: componentName
          });
        }

        // Forward service instance lookup to the FirebaseApp.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (appArg as any)[componentName]();
      };

      // ... and a container for service-level properties.
      if (component.serviceProps !== undefined) {
        deepExtend(serviceNamespace, component.serviceProps);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (namespace as any)[componentName] = serviceNamespace;

      // Patch the FirebaseAppImpl prototype
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (firebaseAppImpl.prototype as any)[componentName] =
        // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
        // option added to the no-explicit-any rule when ESlint releases it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (...args: any) {
          const serviceFxn = this._getService.bind(this, componentName);
          return serviceFxn.apply(
            this,
            component.multipleInstances ? args : []
          );
        };
    }

    return component.type === ComponentType.PUBLIC
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (namespace as any)[componentName]
      : null;
  }

  // Map the requested service to a registered service name
  // (used to map auth to serverAuth service when needed).
  function useAsService(app: FirebaseApp, name: string): string | null {
    if (name === 'serverAuth') {
      return null;
    }

    const useService = name;

    return useService;
  }

  return namespace;
}

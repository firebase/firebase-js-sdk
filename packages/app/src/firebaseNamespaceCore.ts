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
  FirebaseNamespace,
  FirebaseAppConfig
} from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService,
  FirebaseServiceNamespace
} from '@firebase/app-types/private';
import { deepExtend, contains } from '@firebase/util';
import { FirebaseAppImpl } from './firebaseApp';
import { ERROR_FACTORY, AppError } from './errors';
import { FirebaseAppLiteImpl } from './lite/firebaseAppLite';
import { DEFAULT_ENTRY_NAME, PLATFORM_LOG_STRING } from './constants';
import { version } from '../../firebase/package.json';
import { logger } from './logger';
import {
  setUserLogHandler,
  setLogLevel,
  LogCallback,
  LogOptions
} from '@firebase/logger';
import { Component, ComponentType, Name } from '@firebase/component';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components = new Map<string, Component<any>>();

  // A namespace is a plain JavaScript Object.
  const namespace: FirebaseNamespace = {
    // Hack to prevent Babel from modifying the object returned
    // as the firebase namespace.
    // @ts-ignore
    __esModule: true,
    initializeApp,
    // @ts-ignore
    app,
    registerVersion,
    setLogLevel,
    onLog,
    // @ts-ignore
    apps: null,
    SDK_VERSION: version,
    INTERNAL: {
      registerComponent,
      removeApp,
      components,
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
    name = name || DEFAULT_ENTRY_NAME;
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
  function initializeApp(
    options: FirebaseOptions,
    config?: FirebaseAppConfig
  ): FirebaseApp;
  function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
  function initializeApp(
    options: FirebaseOptions,
    rawConfig = {}
  ): FirebaseApp {
    if (typeof rawConfig !== 'object' || rawConfig === null) {
      const name = rawConfig;
      rawConfig = { name };
    }

    const config = rawConfig as FirebaseAppConfig;

    if (config.name === undefined) {
      config.name = DEFAULT_ENTRY_NAME;
    }

    const { name } = config;

    if (typeof name !== 'string' || !name) {
      throw ERROR_FACTORY.create(AppError.BAD_APP_NAME, {
        appName: String(name)
      });
    }

    if (contains(apps, name)) {
      throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: name });
    }

    const app = new firebaseAppImpl(
      options,
      config,
      namespace as _FirebaseNamespace
    );

    apps[name] = app;

    return app;
  }

  /*
   * Return an array of all the non-deleted FirebaseApps.
   */
  function getApps(): FirebaseApp[] {
    // Make a copy so caller cannot mutate the apps list.
    return Object.keys(apps).map(name => apps[name]);
  }

  function registerComponent(
    component: Component
  ): FirebaseServiceNamespace<FirebaseService> | null {
    const componentName = component.name;
    if (components.has(componentName)) {
      logger.debug(
        `There were multiple attempts to register component ${componentName}.`
      );

      return component.type === ComponentType.PUBLIC
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (namespace as any)[componentName]
        : null;
    }

    components.set(componentName, component);

    // create service namespace for public components
    if (component.type === ComponentType.PUBLIC) {
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

    // add the component to existing app instances
    for (const appName of Object.keys(apps)) {
      (apps[appName] as _FirebaseApp)._addComponent(component);
    }

    return component.type === ComponentType.PUBLIC
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (namespace as any)[componentName]
      : null;
  }

  function registerVersion(
    libraryKeyOrName: string,
    version: string,
    variant?: string
  ): void {
    // TODO: We can use this check to whitelist strings when/if we set up
    // a good whitelist system.
    let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
    if (variant) {
      library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = [
        `Unable to register library "${library}" with version "${version}":`
      ];
      if (libraryMismatch) {
        warning.push(
          `library name "${library}" contains illegal characters (whitespace or "/")`
        );
      }
      if (libraryMismatch && versionMismatch) {
        warning.push('and');
      }
      if (versionMismatch) {
        warning.push(
          `version name "${version}" contains illegal characters (whitespace or "/")`
        );
      }
      logger.warn(warning.join(' '));
      return;
    }
    registerComponent(
      new Component(
        `${library}-version` as Name,
        () => ({ library, version }),
        ComponentType.VERSION
      )
    );
  }

  function onLog(logCallback: LogCallback | null, options?: LogOptions): void {
    if (logCallback !== null && typeof logCallback !== 'function') {
      throw ERROR_FACTORY.create(AppError.INVALID_LOG_ARGUMENT, {
        appName: name
      });
    }
    setUserLogHandler(logCallback, options);
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

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
  FirebaseServiceFactory,
  FirebaseServiceNamespace,
  AppHook
} from '@firebase/app-types/private';
import { deepExtend, contains } from '@firebase/util';
import { FirebaseAppImpl } from './firebaseApp';
import { ERROR_FACTORY, AppError } from './errors';
import { FirebaseAppLiteImpl } from './lite/firebaseAppLite';
import { DEFAULT_ENTRY_NAME } from './constants';
import { version } from '../../firebase/package.json';

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
  const factories: { [service: string]: FirebaseServiceFactory } = {};
  const appHooks: { [service: string]: AppHook } = {};

  // A namespace is a plain JavaScript Object.
  const namespace: FirebaseNamespace = {
    // Hack to prevent Babel from modifying the object returned
    // as the firebase namespace.
    // @ts-ignore
    __esModule: true,
    initializeApp,
    // @ts-ignore
    app,
    // @ts-ignore
    apps: null,
    SDK_VERSION: version,
    INTERNAL: {
      registerService,
      removeApp,
      factories,
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
    const app = apps[name];
    callAppHooks(app, 'delete');
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
    callAppHooks(app, 'create');

    return app;
  }

  /*
   * Return an array of all the non-deleted FirebaseApps.
   */
  function getApps(): FirebaseApp[] {
    // Make a copy so caller cannot mutate the apps list.
    return Object.keys(apps).map(name => apps[name]);
  }

  /*
   * Register a Firebase Service.
   *
   * firebase.INTERNAL.registerService()
   *
   * TODO: Implement serviceProperties.
   */
  function registerService(
    name: string,
    createService: FirebaseServiceFactory,
    serviceProperties?: { [prop: string]: unknown },
    appHook?: AppHook,
    allowMultipleInstances = false
  ): FirebaseServiceNamespace<FirebaseService> {
    // Cannot re-register a service that already exists
    if (factories[name]) {
      throw ERROR_FACTORY.create(AppError.DUPLICATE_SERVICE, { appName: name });
    }

    // Capture the service factory for later service instantiation
    factories[name] = createService;

    // Capture the appHook, if passed
    if (appHook) {
      appHooks[name] = appHook;

      // Run the **new** app hook on all existing apps
      getApps().forEach(app => {
        appHook('create', app);
      });
    }

    // The Service namespace is an accessor function ...
    function serviceNamespace(appArg: FirebaseApp = app()): FirebaseService {
      // @ts-ignore
      if (typeof appArg[name] !== 'function') {
        // Invalid argument.
        // This happens in the following case: firebase.storage('gs:/')
        throw ERROR_FACTORY.create(AppError.INVALID_APP_ARGUMENT, {
          appName: name
        });
      }

      // Forward service instance lookup to the FirebaseApp.
      // @ts-ignore
      return appArg[name]();
    }

    // ... and a container for service-level properties.
    if (serviceProperties !== undefined) {
      deepExtend(serviceNamespace, serviceProperties);
    }

    // Monkey-patch the serviceNamespace onto the firebase namespace
    // @ts-ignore
    namespace[name] = serviceNamespace;

    // Patch the FirebaseAppImpl prototype
    // @ts-ignore
    firebaseAppImpl.prototype[name] =
      // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
      // option added to the no-explicit-any rule when ESlint releases it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function(...args: any) {
        const serviceFxn = this._getService.bind(this, name);
        return serviceFxn.apply(this, allowMultipleInstances ? args : []);
      };

    return serviceNamespace;
  }

  function callAppHooks(app: FirebaseApp, eventName: string): void {
    for (const serviceName of Object.keys(factories)) {
      // Ignore virtual services
      const factoryName = useAsService(app, serviceName);
      if (factoryName === null) {
        return;
      }

      if (appHooks[factoryName]) {
        appHooks[factoryName](eventName, app);
      }
    }
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

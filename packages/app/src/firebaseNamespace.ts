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
import {
  createSubscribe,
  deepExtend,
  ErrorFactory,
  patchProperty
} from '@firebase/util';
import { FirebaseAppImpl, DEFAULT_ENTRY_NAME } from './firebaseApp';
import { error, AppError } from './errors';

const contains = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

/**
 * Return a firebase namespace object.
 *
 * In production, this will be called exactly once and the result
 * assigned to the 'firebase' global.  It may be called multiple times
 * in unit tests.
 */
export function createFirebaseNamespace(): FirebaseNamespace {
  let apps_: { [name: string]: FirebaseApp } = {};
  let factories: { [service: string]: FirebaseServiceFactory } = {};
  let appHooks: { [service: string]: AppHook } = {};

  // A namespace is a plain JavaScript Object.
  let namespace = {
    // Hack to prevent Babel from modifying the object returned
    // as the firebase namespace.
    __esModule: true,
    initializeApp: initializeApp,
    app: app as any,
    apps: null as any,
    Promise: Promise,
    SDK_VERSION: '${JSCORE_VERSION}',
    INTERNAL: {
      registerService: registerService,
      createFirebaseNamespace: createFirebaseNamespace,
      extendNamespace: extendNamespace,
      createSubscribe: createSubscribe,
      ErrorFactory: ErrorFactory,
      removeApp: removeApp,
      factories: factories,
      useAsService: useAsService,
      Promise: Promise,
      deepExtend: deepExtend
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
  patchProperty(namespace, 'default', namespace);

  // firebase.apps is a read-only getter.
  Object.defineProperty(namespace, 'apps', {
    get: getApps
  });

  /**
   * Called by App.delete() - but before any services associated with the App
   * are deleted.
   */
  function removeApp(name: string): void {
    let app = apps_[name];
    callAppHooks(app, 'delete');
    delete apps_[name];
  }

  /**
   * Get the App object for a given name (or DEFAULT).
   */
  function app(name?: string): FirebaseApp {
    name = name || DEFAULT_ENTRY_NAME;
    if (!contains(apps_, name)) {
      error(AppError.NO_APP, { name: name });
    }
    return apps_[name];
  }

  patchProperty(app, 'App', FirebaseAppImpl);

  /**
   * Create a new App instance (name must be unique).
   */
  function initializeApp(
    options: FirebaseOptions,
    config?: FirebaseAppConfig
  ): FirebaseApp;
  function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
  function initializeApp(options: FirebaseOptions, rawConfig = {}) {
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
      error(AppError.BAD_APP_NAME, { name: name + '' });
    }

    if (contains(apps_, name)) {
      error(AppError.DUPLICATE_APP, { name: name });
    }

    let app = new FirebaseAppImpl(
      options,
      config!,
      namespace as FirebaseNamespace
    );

    apps_[name!] = app;
    callAppHooks(app, 'create');

    return app;
  }

  /*
   * Return an array of all the non-deleted FirebaseApps.
   */
  function getApps(): FirebaseApp[] {
    // Make a copy so caller cannot mutate the apps list.
    return Object.keys(apps_).map(name => apps_[name]);
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
    serviceProperties?: { [prop: string]: any },
    appHook?: AppHook,
    allowMultipleInstances?: boolean
  ): FirebaseServiceNamespace<FirebaseService> {
    // Cannot re-register a service that already exists
    if (factories[name]) {
      error(AppError.DUPLICATE_SERVICE, { name: name });
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
    const serviceNamespace = (appArg: FirebaseApp = app()) => {
      if (typeof (appArg as any)[name] !== 'function') {
        // Invalid argument.
        // This happens in the following case: firebase.storage('gs:/')
        error(AppError.INVALID_APP_ARGUMENT, { name: name });
      }

      // Forward service instance lookup to the FirebaseApp.
      return (appArg as any)[name]();
    };

    // ... and a container for service-level properties.
    if (serviceProperties !== undefined) {
      deepExtend(serviceNamespace, serviceProperties);
    }

    // Monkey-patch the serviceNamespace onto the firebase namespace
    (namespace as any)[name] = serviceNamespace;

    // Patch the FirebaseAppImpl prototype
    FirebaseAppImpl.prototype[name] = function(...args) {
      const serviceFxn = this._getService.bind(this, name);
      return serviceFxn.apply(this, allowMultipleInstances ? args : []);
    };

    return serviceNamespace;
  }

  /**
   * Patch the top-level firebase namespace with additional properties.
   *
   * firebase.INTERNAL.extendNamespace()
   */
  function extendNamespace(props: { [prop: string]: any }): void {
    deepExtend(namespace, props);
  }

  function callAppHooks(app: FirebaseApp, eventName: string) {
    Object.keys(factories).forEach(serviceName => {
      // Ignore virtual services
      let factoryName = useAsService(app, serviceName);
      if (factoryName === null) {
        return;
      }

      if (appHooks[factoryName]) {
        appHooks[factoryName](eventName, app);
      }
    });
  }

  // Map the requested service to a registered service name
  // (used to map auth to serverAuth service when needed).
  function useAsService(app: FirebaseApp, name: string): string | null {
    if (name === 'serverAuth') {
      return null;
    }

    let useService = name;
    let options = app.options;

    return useService;
  }

  return (namespace as any) as FirebaseNamespace;
}

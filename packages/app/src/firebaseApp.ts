/**
 * @license
 * Copyright 2017 Google Inc.
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
  deepCopy,
  deepExtend,
  ErrorFactory,
  FirebaseError,
  Observer,
  patchProperty,
  Subscribe
} from '@firebase/util';

const contains = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

const DEFAULT_ENTRY_NAME = '[DEFAULT]';

// An array to capture listeners before the true auth functions
// exist
let tokenListeners: any[] = [];

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
class FirebaseAppImpl implements FirebaseApp {
  private options_: FirebaseOptions;
  private name_: string;
  private isDeleted_ = false;
  private services_: {
    [name: string]: {
      [serviceName: string]: FirebaseService;
    };
  } = {};
  private _automaticDataCollectionEnabled: boolean;

  public INTERNAL;

  constructor(
    options: FirebaseOptions,
    config: FirebaseAppConfig,
    private firebase_: FirebaseNamespace
  ) {
    this.name_ = config.name!;
    this._automaticDataCollectionEnabled =
      config.automaticDataCollectionEnabled || false;
    this.options_ = deepCopy<FirebaseOptions>(options);
    this.INTERNAL = {
      getUid: () => null,
      getToken: () => Promise.resolve(null),
      addAuthTokenListener: (callback: (token: string | null) => void) => {
        tokenListeners.push(callback);
        // Make sure callback is called, asynchronously, in the absence of the auth module
        setTimeout(() => callback(null), 0);
      },
      removeAuthTokenListener: callback => {
        tokenListeners = tokenListeners.filter(
          listener => listener !== callback
        );
      }
    };
  }

  get automaticDataCollectionEnabled(): boolean {
    this.checkDestroyed_();
    return this._automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val) {
    this.checkDestroyed_();
    this._automaticDataCollectionEnabled = val;
  }

  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  get options(): FirebaseOptions {
    this.checkDestroyed_();
    return this.options_;
  }

  delete(): Promise<void> {
    return new Promise(resolve => {
      this.checkDestroyed_();
      resolve();
    })
      .then(() => {
        (this.firebase_ as _FirebaseNamespace).INTERNAL.removeApp(this.name_);
        let services: FirebaseService[] = [];
        Object.keys(this.services_).forEach(serviceKey => {
          Object.keys(this.services_[serviceKey]).forEach(instanceKey => {
            services.push(this.services_[serviceKey][instanceKey]);
          });
        });
        return Promise.all(
          services.map(service => {
            return service.INTERNAL!.delete();
          })
        );
      })
      .then(
        (): void => {
          this.isDeleted_ = true;
          this.services_ = {};
        }
      );
  }

  /**
   * Return a service instance associated with this app (creating it
   * on demand), identified by the passed instanceIdentifier.
   *
   * NOTE: Currently storage is the only one that is leveraging this
   * functionality. They invoke it by calling:
   *
   * ```javascript
   * firebase.app().storage('STORAGE BUCKET ID')
   * ```
   *
   * The service name is passed to this already
   * @internal
   */
  _getService(
    name: string,
    instanceIdentifier: string = DEFAULT_ENTRY_NAME
  ): FirebaseService {
    this.checkDestroyed_();

    if (!this.services_[name]) {
      this.services_[name] = {};
    }

    if (!this.services_[name][instanceIdentifier]) {
      /**
       * If a custom instance has been defined (i.e. not '[DEFAULT]')
       * then we will pass that instance on, otherwise we pass `null`
       */
      const instanceSpecifier =
        instanceIdentifier !== DEFAULT_ENTRY_NAME
          ? instanceIdentifier
          : undefined;
      const service = (this.firebase_ as _FirebaseNamespace).INTERNAL.factories[
        name
      ](this, this.extendApp.bind(this), instanceSpecifier);
      this.services_[name][instanceIdentifier] = service;
    }

    return this.services_[name][instanceIdentifier];
  }

  /**
   * Callback function used to extend an App instance at the time
   * of service instance creation.
   */
  private extendApp(props: { [name: string]: any }): void {
    // Copy the object onto the FirebaseAppImpl prototype
    deepExtend(this, props);

    /**
     * If the app has overwritten the addAuthTokenListener stub, forward
     * the active token listeners on to the true fxn.
     *
     * TODO: This function is required due to our current module
     * structure. Once we are able to rely strictly upon a single module
     * implementation, this code should be refactored and Auth should
     * provide these stubs and the upgrade logic
     */
    if (props.INTERNAL && props.INTERNAL.addAuthTokenListener) {
      tokenListeners.forEach(listener => {
        this.INTERNAL.addAuthTokenListener(listener);
      });
      tokenListeners = [];
    }
  }

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  private checkDestroyed_(): void {
    if (this.isDeleted_) {
      error('app-deleted', { name: this.name_ });
    }
  }
}

// Prevent dead-code elimination of these methods w/o invalid property
// copying.
(FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
  FirebaseAppImpl.prototype.delete ||
  console.log('dc');

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
      error('no-app', { name: name });
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
      error('bad-app-name', { name: name + '' });
    }

    if (contains(apps_, name)) {
      error('duplicate-app', { name: name });
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
      error('duplicate-service', { name: name });
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
        error('invalid-app-argument', { name: name });
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

type AppError =
  | 'no-app'
  | 'bad-app-name'
  | 'duplicate-app'
  | 'app-deleted'
  | 'duplicate-service'
  | 'sa-not-supported'
  | 'invalid-app-argument';

function error(code: AppError, args?: { [name: string]: any }) {
  throw appErrors.create(code, args);
}

const errors: { readonly [code in AppError]: string } = {
  'no-app':
    "No Firebase App '{$name}' has been created - " +
    'call Firebase App.initializeApp()',
  'bad-app-name': "Illegal App name: '{$name}",
  'duplicate-app': "Firebase App named '{$name}' already exists",
  'app-deleted': "Firebase App named '{$name}' already deleted",
  'duplicate-service': "Firebase service named '{$name}' already registered",
  'sa-not-supported':
    'Initializing the Firebase SDK with a service ' +
    'account is only allowed in a Node.js environment. On client ' +
    'devices, you should instead initialize the SDK with an api key and ' +
    'auth domain',
  'invalid-app-argument':
    'firebase.{$name}() takes either no argument or a ' +
    'Firebase App instance.'
};

let appErrors = new ErrorFactory<AppError>('app', 'Firebase', errors);

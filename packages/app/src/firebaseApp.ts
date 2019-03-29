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
  deepCopy,
  deepExtend,
  ErrorFactory,
  patchProperty
} from '@firebase/util';

const DEFAULT_ENTRY_NAME = '[DEFAULT]';
/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
class FirebaseAppImpl implements FirebaseApp {
  private options_: FirebaseOptions;
  private name_: string;
  private isDeleted_ = false;
  private services_: {
    [name: string]: FirebaseService;
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
          services.push(this.services_[serviceKey]);
        });
        return Promise.all(
          services.map(service => {
            return service.INTERNAL!.delete();
          })
        );
      })
      .then((): void => {
        this.isDeleted_ = true;
        this.services_ = {};
      });
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
    name: string
  ): FirebaseService {
    this.checkDestroyed_();

    if (!this.services_[name]) {
      const service = (this.firebase_ as _FirebaseNamespace).INTERNAL.factories[
        name
      ](this, this.extendApp.bind(this));
      this.services_[name] = service;
    }

    return this.services_[name];
  }

  /**
   * Callback function used to extend an App instance at the time
   * of service instance creation.
   */
  private extendApp(props: { [name: string]: any }): void {
    // Copy the object onto the FirebaseAppImpl prototype
    deepExtend(this, props);
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

/**
 * Return a firebase namespace object.
 *
 * In production, this will be called exactly once and the result
 * assigned to the 'firebase' global.  It may be called multiple times
 * in unit tests.
 */
export function createFirebaseNamespace(): FirebaseNamespace {
  let appInstance: FirebaseApp;
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
    SDK_VERSION: '${JSCORE_VERSION}',
    INTERNAL: {
      registerService: registerService,
      removeApp: removeApp
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

  /**
   * Called by App.delete() - but before any services associated with the App
   * are deleted.
   */
  function removeApp(): void {
    callAppHooks(appInstance, 'delete');
    appInstance = null;
  }

  /**
   * Get the App object for a given name (or DEFAULT).
   */
  function app(): FirebaseApp {
    if (!appInstance) {
      error('no-app', { name: DEFAULT_ENTRY_NAME });
    }
    return appInstance;
  }

  /**
   * Create a new App instance (name must be unique).
   */
  function initializeApp(options: FirebaseOptions): FirebaseApp {

    const config = {
      name: DEFAULT_ENTRY_NAME,
      automaticDataCollectionEnabled: false
    } as FirebaseAppConfig;

    if (appInstance) {
      error('duplicate-app', { name: DEFAULT_ENTRY_NAME });
    }

    let app = new FirebaseAppImpl(
      options,
      config!,
      namespace as FirebaseNamespace
    );

    appInstance = app;
    callAppHooks(app, 'create');

    return app;
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
      if (appInstance) {
        appHook('create', appInstance);
      }
    }

    // The Service namespace is an accessor function ...
    const serviceNamespace = () => {
      // Forward service instance lookup to the FirebaseApp.
      return (app())[name]();
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
      return serviceFxn.apply(this);
    };

    return serviceNamespace;
  }

  function callAppHooks(app: FirebaseApp, eventName: string) {
    Object.keys(factories).forEach(serviceName => {
      if (appHooks[serviceName]) {
        appHooks[serviceName](eventName, app);
      }
    });
  }

  return (namespace as any) as FirebaseNamespace;
}

type AppError =
  | 'no-app'
  | 'duplicate-app'
  | 'app-deleted'
  | 'duplicate-service'

function error(code: AppError, args?: { [name: string]: any }) {
  throw appErrors.create(code, args);
}

// TypeScript does not support non-string indexes!
// let errors: {[code: AppError: string} = {
let errors: { [code in AppError]: string } = {
  'no-app':
    "No Firebase App '{$name}' has been created - " +
    'call Firebase App.initializeApp()',
  'duplicate-app': "Firebase App named '{$name}' already exists",
  'app-deleted': "Firebase App named '{$name}' already deleted",
  'duplicate-service': "Firebase service named '{$name}' already registered",
};

let appErrors = new ErrorFactory<AppError>('app', 'Firebase', errors);

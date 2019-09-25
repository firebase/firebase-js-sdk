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
  FirebaseAppConfig
} from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService,
  FirebaseAppInternals
} from '@firebase/app-types/private';
import { deepCopy, deepExtend } from '@firebase/util';
import { AppError, ERROR_FACTORY } from './errors';
import { DEFAULT_ENTRY_NAME } from './constants';

interface ServicesCache {
  [name: string]: {
    [serviceName: string]: FirebaseService;
  };
}

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppImpl implements FirebaseApp {
  private readonly options_: FirebaseOptions;
  private readonly name_: string;
  private isDeleted_ = false;
  private services_: ServicesCache = {};
  private automaticDataCollectionEnabled_: boolean;
  // An array to capture listeners before the true auth functions
  // exist
  private tokenListeners_: Array<(token: string | null) => void> = [];
  // An array to capture requests to send events before analytics component loads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, use any here to make using function.apply easier
  private analyticsEventRequests_: any[] = [];

  INTERNAL: FirebaseAppInternals;

  constructor(
    options: FirebaseOptions,
    config: FirebaseAppConfig,
    private readonly firebase_: _FirebaseNamespace
  ) {
    this.name_ = config.name!;
    this.automaticDataCollectionEnabled_ =
      config.automaticDataCollectionEnabled || false;
    this.options_ = deepCopy<FirebaseOptions>(options);
    const self = this;
    this.INTERNAL = {
      getUid: () => null,
      getToken: () => Promise.resolve(null),
      addAuthTokenListener: (callback: (token: string | null) => void) => {
        this.tokenListeners_.push(callback);
        // Make sure callback is called, asynchronously, in the absence of the auth module
        setTimeout(() => callback(null), 0);
      },
      removeAuthTokenListener: callback => {
        this.tokenListeners_ = this.tokenListeners_.filter(
          listener => listener !== callback
        );
      },
      analytics: {
        logEvent() {
          self.analyticsEventRequests_.push(arguments);
        }
      }
    };
  }

  get automaticDataCollectionEnabled(): boolean {
    this.checkDestroyed_();
    return this.automaticDataCollectionEnabled_;
  }

  set automaticDataCollectionEnabled(val) {
    this.checkDestroyed_();
    this.automaticDataCollectionEnabled_ = val;
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
        this.firebase_.INTERNAL.removeApp(this.name_);
        const services: FirebaseService[] = [];

        for (const serviceKey of Object.keys(this.services_)) {
          for (const instanceKey of Object.keys(this.services_[serviceKey])) {
            services.push(this.services_[serviceKey][instanceKey]);
          }
        }

        return Promise.all(
          services
            .filter(service => 'INTERNAL' in service)
            .map(service => service.INTERNAL!.delete())
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
   * NOTE: Currently storage and functions are the only ones that are leveraging this
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
      const service = this.firebase_.INTERNAL.factories[name](
        this,
        this.extendApp.bind(this),
        instanceSpecifier
      );
      this.services_[name][instanceIdentifier] = service;
    }

    return this.services_[name][instanceIdentifier];
  }
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
  _removeServiceInstance(
    name: string,
    instanceIdentifier: string = DEFAULT_ENTRY_NAME
  ): void {
    if (this.services_[name] && this.services_[name][instanceIdentifier]) {
      delete this.services_[name][instanceIdentifier];
    }
  }

  /**
   * Callback function used to extend an App instance at the time
   * of service instance creation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extendApp(props: { [name: string]: any }): void {
    // Copy the object onto the FirebaseAppImpl prototype
    deepExtend(this, props);

    if (props.INTERNAL) {
      /**
       * If the app has overwritten the addAuthTokenListener stub, forward
       * the active token listeners on to the true fxn.
       *
       * TODO: This function is required due to our current module
       * structure. Once we are able to rely strictly upon a single module
       * implementation, this code should be refactored and Auth should
       * provide these stubs and the upgrade logic
       */
      if (props.INTERNAL.addAuthTokenListener) {
        for (const listener of this.tokenListeners_) {
          this.INTERNAL.addAuthTokenListener(listener);
        }
        this.tokenListeners_ = [];
      }

      if (props.INTERNAL.analytics) {
        for (const request of this.analyticsEventRequests_) {
          // logEvent is the actual implementation at this point.
          // We forward the queued events to it.
          this.INTERNAL.analytics.logEvent.apply(undefined, request);
        }
        this.analyticsEventRequests_ = [];
      }
    }
  }

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  private checkDestroyed_(): void {
    if (this.isDeleted_) {
      throw ERROR_FACTORY.create(AppError.APP_DELETED, { appName: this.name_ });
    }
  }
}

// Prevent dead-code elimination of these methods w/o invalid property
// copying.
(FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
  FirebaseAppImpl.prototype.delete ||
  console.log('dc');

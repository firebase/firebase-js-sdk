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
  FirebaseAppConfig
} from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';
import { deepCopy, deepExtend } from '@firebase/util';
import { ERROR_FACTORY, AppError } from '../errors';
import { DEFAULT_ENTRY_NAME } from '../constants';

interface ServicesCache {
  [name: string]: {
    [serviceName: string]: FirebaseService;
  };
}

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppLiteImpl implements FirebaseApp {
  private readonly options_: FirebaseOptions;
  private readonly name_: string;
  private isDeleted_ = false;
  private services_: ServicesCache = {};
  private automaticDataCollectionEnabled_: boolean;

  // lite version has an empty INTERNAL namespace
  readonly INTERNAL = {};

  constructor(
    options: FirebaseOptions,
    config: FirebaseAppConfig,
    private readonly firebase_: _FirebaseNamespace
  ) {
    this.name_ = config.name!;
    this.automaticDataCollectionEnabled_ =
      config.automaticDataCollectionEnabled || false;
    this.options_ = deepCopy<FirebaseOptions>(options);
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
   * Callback function used to extend an App instance at the time
   * of service instance creation.
   */
  private extendApp(props: { [name: string]: unknown }): void {
    // Copy the object onto the FirebaseAppImpl prototype
    deepExtend(this, props);
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

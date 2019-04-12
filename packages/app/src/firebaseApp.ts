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
  FirebaseService
} from '@firebase/app-types/private';

import { deepCopy, deepExtend } from '@firebase/util';
import { error, AppError } from './errors';

export const DEFAULT_ENTRY_NAME = '[DEFAULT]';

// An array to capture listeners before the true auth functions
// exist
let tokenListeners: any[] = [];

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppImpl implements FirebaseApp {
  private options_: FirebaseOptions;
  private name_: string;
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
    this.INTERNAL = {};
  }

  get automaticDataCollectionEnabled(): boolean {
    return this._automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val) {
    this._automaticDataCollectionEnabled = val;
  }

  get name(): string {
    return this.name_;
  }

  get options(): FirebaseOptions {
    return this.options_;
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
  _getService(name: string): FirebaseService {
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
      error(AppError.APP_DELETED, { name: this.name_ });
    }
  }
}

// Prevent dead-code elimination of these methods w/o invalid property
// copying.
(FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
  FirebaseAppImpl.prototype.delete ||
  console.log('dc');

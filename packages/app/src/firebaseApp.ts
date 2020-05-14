/**
 * @license
 * Copyright 2017 Google LLC
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
import { deepCopy } from '@firebase/util';
import {
  ComponentContainer,
  Component,
  ComponentType,
  Name
} from '@firebase/component';
import { AppError, ERROR_FACTORY } from './errors';
import { DEFAULT_ENTRY_NAME } from './constants';
import { logger } from './logger';

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppImpl implements FirebaseApp {
  private readonly options_: FirebaseOptions;
  private readonly name_: string;
  private isDeleted_ = false;
  private automaticDataCollectionEnabled_: boolean;
  private container: ComponentContainer;

  constructor(
    options: FirebaseOptions,
    config: FirebaseAppConfig,
    private readonly firebase_: _FirebaseNamespace
  ) {
    this.name_ = config.name!;
    this.automaticDataCollectionEnabled_ =
      config.automaticDataCollectionEnabled || false;
    this.options_ = deepCopy<FirebaseOptions>(options);
    this.container = new ComponentContainer(config.name!);

    // add itself to container
    this._addComponent(new Component('app', () => this, ComponentType.PUBLIC));
    // populate ComponentContainer with existing components
    for (const component of this.firebase_.INTERNAL.components.values()) {
      this._addComponent(component);
    }
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

        return Promise.all(
          this.container.getProviders().map(provider => provider.delete())
        );
      })
      .then((): void => {
        this.isDeleted_ = true;
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

    // getImmediate will always succeed because _getService is only called for registered components.
    return (this.container.getProvider(name as Name).getImmediate({
      identifier: instanceIdentifier
    }) as unknown) as FirebaseService;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.container.getProvider(name as any).clearInstance(instanceIdentifier);
  }

  /**
   * @param component the component being added to this app's container
   */
  _addComponent(component: Component): void {
    try {
      this.container.addComponent(component);
    } catch (e) {
      logger.debug(
        `Component ${component.name} failed to register with FirebaseApp ${this.name}`,
        e
      );
    }
  }

  _addOrOverwriteComponent(component: Component): void {
    this.container.addOrOverwriteComponent(component);
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

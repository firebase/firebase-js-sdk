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

import { FirebaseApp, FirebaseOptions } from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';
import {
  Component,
  ComponentType,
  Name,
  ComponentContainer
} from '@firebase/component';
import { _FirebaseAppInternal } from '@firebase/app-types-exp';
import {
  deleteApp,
  _addComponent,
  _addOrOverwriteComponent,
  _DEFAULT_ENTRY_NAME
} from '@firebase/app-exp';

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppImpl implements FirebaseApp {
  private readonly container: ComponentContainer;

  constructor(
    private readonly app: _FirebaseAppInternal,
    private readonly firebase: _FirebaseNamespace
  ) {
    // add itself to container
    // TODO: change the component name to 'app-compat' before the official release
    _addComponent(app, new Component('app', () => this, ComponentType.PUBLIC));
    this.container = app.container;
  }

  get automaticDataCollectionEnabled(): boolean {
    return this.app.automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val) {
    this.app.automaticDataCollectionEnabled = val;
  }

  get name(): string {
    return this.app.name;
  }

  get options(): FirebaseOptions {
    return this.app.options;
  }

  delete(): Promise<void> {
    return new Promise(resolve => {
      this.app.checkDestroyed();
      resolve();
    }).then(() => {
      this.firebase.INTERNAL.removeApp(this.name);
      return deleteApp(this.app);
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
    instanceIdentifier: string = _DEFAULT_ENTRY_NAME
  ): FirebaseService {
    this.app.checkDestroyed();

    // getImmediate will always succeed because _getService is only called for registered components.
    return (this.app.container.getProvider(name as Name).getImmediate({
      identifier: instanceIdentifier
    }) as unknown) as FirebaseService;
  }

  /**
   * Remove a service instance from the cache, so we will create a new instance for this service
   * when people try to get it again.
   *
   * NOTE: currently only firestore uses this functionality to support firestore shutdown.
   *
   * @param name The service name
   * @param instanceIdentifier instance identifier in case multiple instances are allowed
   * @internal
   */
  _removeServiceInstance(
    name: string,
    instanceIdentifier: string = _DEFAULT_ENTRY_NAME
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app.container
      .getProvider(name as any)
      .clearInstance(instanceIdentifier);
  }

  /**
   * @param component the component being added to this app's container
   * @internal
   */
  _addComponent(component: Component): void {
    _addComponent(this.app, component);
  }

  _addOrOverwriteComponent(component: Component): void {
    _addOrOverwriteComponent(this.app, component);
  }
}

// TODO: investigate why the following needs to be commented out
// Prevent dead-code elimination of these methods w/o invalid property
// copying.
// (FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
//   FirebaseAppImpl.prototype.delete ||
//   console.log('dc');

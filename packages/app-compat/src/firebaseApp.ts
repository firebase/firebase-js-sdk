/**
 * @license
 * Copyright 2020 Google LLC
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

import { FirebaseOptions } from './public-types';
import {
  Component,
  ComponentContainer,
  ComponentType,
  InstantiationMode,
  Name
} from '@firebase/component';
import {
  deleteApp,
  _addComponent,
  _addOrOverwriteComponent,
  _DEFAULT_ENTRY_NAME,
  _FirebaseAppInternal as _FirebaseAppExp
} from '@firebase/app';
import { _FirebaseService, _FirebaseNamespace } from './types';
import { Compat } from '@firebase/util';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _FirebaseApp {
  /**
   * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
   * App.
   */
  name: string;

  /**
   * The (read-only) configuration options from the app initialization.
   */
  options: FirebaseOptions;

  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled: boolean;

  /**
   * Make the given App unusable and free resources.
   */
  delete(): Promise<void>;
}
/**
 * Global context object for a collection of services using
 * a shared authentication state.
 *
 * marked as internal because it references internal types exported from @firebase/app
 * @internal
 */
export class FirebaseAppImpl implements Compat<_FirebaseAppExp>, _FirebaseApp {
  private container: ComponentContainer;

  constructor(
    readonly _delegate: _FirebaseAppExp,
    private readonly firebase: _FirebaseNamespace
  ) {
    // add itself to container
    _addComponent(
      _delegate,
      new Component('app-compat', () => this, ComponentType.PUBLIC)
    );

    this.container = _delegate.container;
  }

  get automaticDataCollectionEnabled(): boolean {
    return this._delegate.automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val) {
    this._delegate.automaticDataCollectionEnabled = val;
  }

  get name(): string {
    return this._delegate.name;
  }

  get options(): FirebaseOptions {
    return this._delegate.options;
  }

  delete(): Promise<void> {
    return new Promise<void>(resolve => {
      this._delegate.checkDestroyed();
      resolve();
    }).then(() => {
      this.firebase.INTERNAL.removeApp(this.name);
      return deleteApp(this._delegate);
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
  ): _FirebaseService {
    this._delegate.checkDestroyed();

    // Initialize instance if InstatiationMode is `EXPLICIT`.
    const provider = this._delegate.container.getProvider(name as Name);
    if (
      !provider.isInitialized() &&
      provider.getComponent()?.instantiationMode === InstantiationMode.EXPLICIT
    ) {
      provider.initialize();
    }

    // getImmediate will always succeed because _getService is only called for registered components.
    return provider.getImmediate({
      identifier: instanceIdentifier
    }) as unknown as _FirebaseService;
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
    this._delegate.container
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .getProvider(name as any)
      .clearInstance(instanceIdentifier);
  }

  /**
   * @param component the component being added to this app's container
   * @internal
   */
  _addComponent(component: Component): void {
    _addComponent(this._delegate, component);
  }

  _addOrOverwriteComponent(component: Component): void {
    _addOrOverwriteComponent(this._delegate, component);
  }

  toJSON(): object {
    return {
      name: this.name,
      automaticDataCollectionEnabled: this.automaticDataCollectionEnabled,
      options: this.options
    };
  }
}

// TODO: investigate why the following needs to be commented out
// Prevent dead-code elimination of these methods w/o invalid property
// copying.
// (FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
//   FirebaseAppImpl.prototype.delete ||
//   console.log('dc');

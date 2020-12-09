/**
 * @license
 * Copyright 2019 Google LLC
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
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';
import {
  deleteApp,
  _addComponent,
  _DEFAULT_ENTRY_NAME
} from '@firebase/app-exp';
import { _FirebaseAppInternal } from '@firebase/app-types-exp';
import { Component, ComponentType, Name } from '@firebase/component';

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppLiteImpl implements FirebaseApp {
  constructor(
    private readonly app: _FirebaseAppInternal,
    private readonly firebase: _FirebaseNamespace
  ) {
    // add itself to container
    _addComponent(app, new Component('app', () => this, ComponentType.PUBLIC));
  }

  get automaticDataCollectionEnabled(): boolean {
    return this.app.automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val) {
    this.automaticDataCollectionEnabled = val;
  }

  get name(): string {
    return this.app.name;
  }

  get options(): FirebaseOptions {
    return this.app.options;
  }

  delete(): Promise<void> {
    this.firebase.INTERNAL.removeApp(this.name);
    return deleteApp(this.app);
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
    instanceIdentifier: string = _DEFAULT_ENTRY_NAME
  ): FirebaseService {
    this.app.checkDestroyed();

    // getImmediate will always succeed because _getService is only called for registered components.
    return (this.app.container.getProvider(name as Name).getImmediate({
      identifier: instanceIdentifier
    }) as unknown) as FirebaseService;
  }
}

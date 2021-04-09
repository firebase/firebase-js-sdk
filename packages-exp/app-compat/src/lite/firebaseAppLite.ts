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

import { FirebaseApp, FirebaseOptions } from '../public-types';
import { _FirebaseNamespace, _FirebaseService } from '../types';
import {
  deleteApp,
  _addComponent,
  _DEFAULT_ENTRY_NAME,
  _FirebaseAppInternal as FirebaseAppExp
} from '@firebase/app-exp';
import { Component, ComponentType, Name } from '@firebase/component';
import { Compat } from '@firebase/util';

/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
export class FirebaseAppLiteImpl
  implements FirebaseApp, Compat<FirebaseAppExp> {
  constructor(
    readonly _delegate: FirebaseAppExp,
    private readonly firebase: _FirebaseNamespace
  ) {
    // add itself to container
    _addComponent(
      _delegate,
      new Component('app-compat', () => this, ComponentType.PUBLIC)
    );
  }

  get automaticDataCollectionEnabled(): boolean {
    return this._delegate.automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val) {
    this.automaticDataCollectionEnabled = val;
  }

  get name(): string {
    return this._delegate.name;
  }

  get options(): FirebaseOptions {
    return this._delegate.options;
  }

  delete(): Promise<void> {
    this.firebase.INTERNAL.removeApp(this.name);
    return deleteApp(this._delegate);
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
  ): _FirebaseService {
    this._delegate.checkDestroyed();

    // getImmediate will always succeed because _getService is only called for registered components.
    return (this._delegate.container.getProvider(name as Name).getImmediate({
      identifier: instanceIdentifier
    }) as unknown) as _FirebaseService;
  }
}

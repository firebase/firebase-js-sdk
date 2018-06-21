/**
 * Copyright 2018 Google Inc.
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
  FirebaseApp as IFirebaseApp,
  FirebaseOptions
} from '@firebase/app-types';
import { ReplaySubject } from 'rxjs';

export interface AppEvent {
  type: string;
  payload?: any;
}

export class FirebaseApp implements IFirebaseApp {
  private _name: string;
  private _options: FirebaseOptions;
  private _automaticDataCollectionEnabled: boolean = false;
  private _isDestroyed: boolean = false;

  public event$: ReplaySubject<AppEvent> = new ReplaySubject();

  constructor(options: FirebaseOptions, name: string = '[DEFAULT]') {
    if (typeof name !== 'string') {
      throw new Error('bad-app-name');
    }
    this._name = name;

    // Copy options object
    this._options = Object.assign({}, options);

    this.event$.next({ type: 'created' });
  }

  public get name() {
    this._checkDestroyed();
    return this._name;
  }

  public get automaticDataCollectionEnabled() {
    this._checkDestroyed();
    return this._automaticDataCollectionEnabled;
  }

  public set automaticDataCollectionEnabled(val) {
    this._checkDestroyed();
    this._automaticDataCollectionEnabled = val;
  }

  public get options() {
    this._checkDestroyed();
    return this._options;
  }

  public async delete() {
    this._checkDestroyed();

    this.event$.next({ type: 'deleted' });
    this.event$.complete();

    this._isDestroyed = true;
  }

  private _checkDestroyed() {
    if (this._isDestroyed) {
      throw new Error('app-deleted');
    }
  }
}

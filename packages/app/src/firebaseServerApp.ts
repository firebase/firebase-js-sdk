/**
 * @license
 * Copyright 2023 Google LLC
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
  FirebaseAppSettings,
  FirebaseServerApp,
  FirebaseServerAppSettings,
  FirebaseOptions
} from './public-types';
import {
  ComponentContainer
} from '@firebase/component';
import {FirebaseAppImpl} from './firebaseApp';
import { DEFAULT_ENTRY_NAME } from './constants';

export class FirebaseServerAppImpl extends FirebaseAppImpl implements FirebaseServerApp {
  private readonly _serverConfig: Required<FirebaseServerAppSettings>;
  private readonly _headers: object;
  private readonly _setCookieCallback: (name: string, value: string) => void;
  
  constructor(
    options: FirebaseOptions,
    serverConfig: FirebaseServerAppSettings,
    container: ComponentContainer
  ) {

    let name:string = DEFAULT_ENTRY_NAME;
    if(serverConfig.name !== undefined) {
      name = serverConfig.name;
    }

    let automaticDataCollectionEnabled = false;
    if(serverConfig.automaticDataCollectionEnabled !== undefined) {
      automaticDataCollectionEnabled = serverConfig.automaticDataCollectionEnabled;
    }

    const config:Required<FirebaseAppSettings> = {
      name,
      automaticDataCollectionEnabled
    };
    
    super(options, config, container);
    this._serverConfig = {
      name,
      automaticDataCollectionEnabled,
      setCookieCallback: this.defaultSetCookieCallback,
      ...serverConfig
    };
    this._headers = this._serverConfig.headers;
    this._setCookieCallback = this._serverConfig.setCookieCallback;
  }
  
  private defaultSetCookieCallback(name: string, value: string): void {
    console.log(name);
    console.log(value);
  }

  get automaticDataCollectionEnabled(): boolean {
    this.checkDestroyed();
    return this._automaticDataCollectionEnabled;
  }

  set automaticDataCollectionEnabled(val: boolean) {
    this.checkDestroyed();
    this._automaticDataCollectionEnabled = val;
  }

  get name(): string {
    this.checkDestroyed();
    return this._name;
  }

  get options(): FirebaseOptions {
    this.checkDestroyed();
    return this._options;
  }

  get config(): Required<FirebaseServerAppSettings> {
    this.checkDestroyed();
    return this._serverConfig;
  }

  get container(): ComponentContainer {
    return this._container;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  set isDeleted(val: boolean) {
    this._isDeleted = val;
  }

  get headers(): object {
    return this._headers;
  }

  callSetCookieCallback(cookieName: string, cookieValue: string) : void {
    if(this._setCookieCallback !== undefined) {
      this._setCookieCallback(cookieName, cookieValue);
    }
  }
}

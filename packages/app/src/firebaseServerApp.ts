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
  FirebaseServerApp,
  FirebaseOptions,
  FirebaseServerAppSettings
} from './public-types';
import {
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { ERROR_FACTORY, AppError } from './errors';
import { DEFAULT_ENTRY_NAME } from './constants';

export class FirebaseServerAppImpl implements FirebaseServerApp {
  /**
   * Original config values passed in as a constructor parameter.
   * It is only used to compare with another config object to support idempotent
   * initializeServerAppInstance().
   *
   * Updating automaticDataCollectionEnabled on the App instance will not change its value in
   * _config.
   */
  private readonly _config: Required<FirebaseServerAppSettings>;
  private readonly _options: FirebaseOptions;
  private readonly _name: string;
  private _automaticDataCollectionEnabled: boolean;
  private readonly _headers: object;
  private readonly _setCookieCallback: (name: string, value: string) => void;
  private _isDeleted = false;
  private readonly _container: ComponentContainer;

  constructor(
    options: FirebaseOptions,
    config: FirebaseServerAppSettings,
    container: ComponentContainer
  ) {
    this._options = { ...options };
    this._config = {
      
      name: DEFAULT_ENTRY_NAME,
      automaticDataCollectionEnabled: false,
      setCookieCallback: this.defaultSetCookieCallback,
      ...config
    };
    this._name = this._config.name;
    this._automaticDataCollectionEnabled =
      this._config.automaticDataCollectionEnabled;
    this._headers = this._config.headers;
    this._setCookieCallback = this._config.setCookieCallback;
    
    
    this._container = container;
    this.container.addComponent(
      new Component('app', () => this, ComponentType.PUBLIC)
    );
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
    return this._config;
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

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  private checkDestroyed(): void {
    if (this.isDeleted) {
      throw ERROR_FACTORY.create(AppError.APP_DELETED, { appName: this._name });
    }
  }
}

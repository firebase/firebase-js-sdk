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

import {
  FirebaseApp,
  FirebaseOptions,
  FirebaseAppSettings
} from './public-types';
import {
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { ERROR_FACTORY, AppError } from './errors';

export class FirebaseAppImpl implements FirebaseApp {
  private readonly _options: FirebaseOptions;
  private readonly _name: string;
  /**
   * Original config values passed in as a constructor parameter.
   * It is only used to compare with another config object to support idempotent initializeApp().
   *
   * Updating automaticDataCollectionEnabled on the App instance will not change its value in _config.
   */
  private readonly _config: Required<FirebaseAppSettings>;
  private _automaticDataCollectionEnabled: boolean;
  private _isDeleted = false;
  private readonly _container: ComponentContainer;

  constructor(
    options: FirebaseOptions,
    config: Required<FirebaseAppSettings>,
    container: ComponentContainer
  ) {
    this._options = { ...options };
    this._config = { ...config };
    this._name = config.name;
    this._automaticDataCollectionEnabled =
      config.automaticDataCollectionEnabled;
    this._container = container;
    this.container.addComponent(
      new Component('app', () => this, ComponentType.PUBLIC)
    );
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

  get config(): Required<FirebaseAppSettings> {
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

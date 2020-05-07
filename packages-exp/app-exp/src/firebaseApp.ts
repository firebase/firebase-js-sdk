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
  FirebaseAppConfig
} from '@firebase/app-types-exp';
import {
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { ERROR_FACTORY, AppError } from './errors';

export class FirebaseAppImpl implements FirebaseApp {
  private readonly options_: FirebaseOptions;
  private readonly name_: string;
  private automaticDataCollectionEnabled_: boolean;
  private isDeleted = false;
  private readonly container: ComponentContainer;

  constructor(
    options: FirebaseOptions,
    config: Required<FirebaseAppConfig>,
    container: ComponentContainer
  ) {
    this.options_ = { ...options };
    this.name_ = config.name;
    this.automaticDataCollectionEnabled_ =
      config.automaticDataCollectionEnabled;
    this.container = container;
    this.container.addComponent(
      new Component('app-exp', () => this, ComponentType.PUBLIC)
    );
  }

  get automaticDataCollectionEnabled(): boolean {
    this.checkDestroyed();
    return this.automaticDataCollectionEnabled_;
  }

  set automaticDataCollectionEnabled(val: boolean) {
    this.checkDestroyed();
    this.automaticDataCollectionEnabled_ = val;
  }

  get name(): string {
    this.checkDestroyed();
    return this.name_;
  }

  get options(): FirebaseOptions {
    this.checkDestroyed();
    return this.options_;
  }

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  private checkDestroyed(): void {
    if (this.isDeleted) {
      throw ERROR_FACTORY.create(AppError.APP_DELETED, { appName: this.name_ });
    }
  }
}

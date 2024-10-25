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
import { deleteApp, registerVersion } from './api';
import { ComponentContainer } from '@firebase/component';
import { FirebaseAppImpl } from './firebaseApp';
import { ERROR_FACTORY, AppError } from './errors';
import { name as packageName, version } from '../package.json';

export class FirebaseServerAppImpl
  extends FirebaseAppImpl
  implements FirebaseServerApp
{
  private readonly _serverConfig: FirebaseServerAppSettings;
  private _finalizationRegistry: FinalizationRegistry<object> | null;
  private _refCount: number;

  constructor(
    options: FirebaseOptions | FirebaseAppImpl,
    serverConfig: FirebaseServerAppSettings,
    name: string,
    container: ComponentContainer
  ) {
    // Build configuration parameters for the FirebaseAppImpl base class.
    const automaticDataCollectionEnabled =
      serverConfig.automaticDataCollectionEnabled !== undefined
        ? serverConfig.automaticDataCollectionEnabled
        : false;

    // Create the FirebaseAppSettings object for the FirebaseAppImp constructor.
    const config: Required<FirebaseAppSettings> = {
      name,
      automaticDataCollectionEnabled
    };

    if ((options as FirebaseOptions).apiKey !== undefined) {
      // Construct the parent FirebaseAppImp object.
      super(options as FirebaseOptions, config, container);
    } else {
      const appImpl: FirebaseAppImpl = options as FirebaseAppImpl;
      super(appImpl.options, config, container);
    }

    // Now construct the data for the FirebaseServerAppImpl.
    this._serverConfig = {
      automaticDataCollectionEnabled,
      ...serverConfig
    };

    this._finalizationRegistry = null;
    if (typeof FinalizationRegistry !== 'undefined') {
      this._finalizationRegistry = new FinalizationRegistry(() => {
        this.automaticCleanup();
      });
    }

    this._refCount = 0;
    this.incRefCount(this._serverConfig.releaseOnDeref);

    // Do not retain a hard reference to the dref object, otherwise the FinalizationRegistry
    // will never trigger.
    this._serverConfig.releaseOnDeref = undefined;
    serverConfig.releaseOnDeref = undefined;

    registerVersion(packageName, version, 'serverapp');
  }

  toJSON(): undefined {
    return undefined;
  }

  get refCount(): number {
    return this._refCount;
  }

  // Increment the reference count of this server app. If an object is provided, register it
  // with the finalization registry.
  incRefCount(obj: object | undefined): void {
    if (this.isDeleted) {
      return;
    }
    this._refCount++;
    if (obj !== undefined && this._finalizationRegistry !== null) {
      this._finalizationRegistry.register(obj, this);
    }
  }

  // Decrement the reference count.
  decRefCount(): number {
    if (this.isDeleted) {
      return 0;
    }
    return --this._refCount;
  }

  // Invoked by the FinalizationRegistry callback to note that this app should go through its
  // reference counts and delete itself if no reference count remain. The coordinating logic that
  // handles this is in deleteApp(...).
  private automaticCleanup(): void {
    void deleteApp(this);
  }

  get settings(): FirebaseServerAppSettings {
    this.checkDestroyed();
    return this._serverConfig;
  }

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  protected checkDestroyed(): void {
    if (this.isDeleted) {
      throw ERROR_FACTORY.create(AppError.SERVER_APP_DELETED);
    }
  }
}

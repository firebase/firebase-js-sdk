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
import { deleteApp } from './api';
import { ComponentContainer } from '@firebase/component';
import { FirebaseAppImpl } from './firebaseApp';

export class FirebaseServerAppImpl
  extends FirebaseAppImpl
  implements FirebaseServerApp
{
  private readonly _serverConfig: FirebaseServerAppSettings;
  private _finalizationRegistry: FinalizationRegistry<object>;

  constructor(
    options: FirebaseOptions | FirebaseAppImpl,
    serverConfig: FirebaseServerAppSettings,
    container: ComponentContainer
  ) {
    // Build configuration parameters for the FirebaseAppImpl base class.
    const automaticDataCollectionEnabled =
      serverConfig.automaticDataCollectionEnabled !== undefined
        ? serverConfig.automaticDataCollectionEnabled
        : false;

    // Create the FirebaseAppSettings object for the FirebaseAppImp constructor.
    const config: Required<FirebaseAppSettings> = {
      name: "",
      automaticDataCollectionEnabled
    };

    if((options as FirebaseOptions).apiKey !== undefined) {
      // Construct the parent FirebaseAppImp object.
      super(options as FirebaseOptions, config, container);
    } else {
      const appImpl : FirebaseAppImpl = options as FirebaseAppImpl;
      
      super(appImpl.options, config, container);
    }

    // Now construct the data for the FirebaseServerAppImpl.
    this._serverConfig = {
      automaticDataCollectionEnabled,
      ...serverConfig
    };

    this._finalizationRegistry = new FinalizationRegistry(
      this.automaticCleanup
    );

    if (this._serverConfig.releaseOnDeref !== undefined) {
      this._finalizationRegistry.register(
        this._serverConfig.releaseOnDeref,
        this
      );
      this._serverConfig.releaseOnDeref = undefined; // Don't keep a strong reference to the object.
    }
  }

  private automaticCleanup(serverApp: FirebaseServerAppImpl): void {
    // TODO: implement reference counting.
    void deleteApp(serverApp);
  }

  get serverAppConfig(): FirebaseServerAppSettings {
    this.checkDestroyed();
    return this._serverConfig;
  }

  authIdTokenVerified() : Promise<void> {
    // TODO
    return Promise.resolve();
  }

  appCheckTokenVerified() : Promise<void> {
    // TODO
    return Promise.resolve();
  }

  installationTokenVerified() : Promise<void> {
    // TODO
    return Promise.resolve();
  }
}

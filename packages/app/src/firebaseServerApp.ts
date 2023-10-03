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
  deleteApp
} from './api';
import {
  ComponentContainer
} from '@firebase/component';
import { FirebaseAppImpl } from './firebaseApp';
import { DEFAULT_ENTRY_NAME } from './constants';

export class FirebaseServerAppImpl extends FirebaseAppImpl implements FirebaseServerApp {
  private readonly _serverConfig: FirebaseServerAppSettings;
  private readonly _setCookieCallback?: (name: string, value: string) => void;
  private readonly _getCookieCallback?: (name: string) => string | undefined;
  private readonly _getHeaderCallback?: (name: string) => string | undefined;
  private _finalizationRegistry: FinalizationRegistry<object>;

  constructor(
    options: FirebaseOptions,
    serverConfig: FirebaseServerAppSettings,
    container: ComponentContainer
  ) {
    // Build configuration parameters for the FirebaseAppImpl base class.
    const name: string = (serverConfig.name !== undefined) ? serverConfig.name : DEFAULT_ENTRY_NAME;
    const automaticDataCollectionEnabled =
      (serverConfig.automaticDataCollectionEnabled !== undefined) ? serverConfig.automaticDataCollectionEnabled : false;

    // Create the FirebaseAppSettings object for the FirebaseAppImp constructor.
    const config: Required<FirebaseAppSettings> = {
      name, automaticDataCollectionEnabled
    };

    // Construct the parent FirebaseAppImp object.
    super(options, config, container);

    // Now construct the data for the FirebaseServerAppImpl.
    this._serverConfig = {
      name, automaticDataCollectionEnabled,
      ...serverConfig
    };

    this._setCookieCallback = this._serverConfig.setCookieCallback;
    this._getCookieCallback = this._serverConfig.getCookieCallback;
    this._getHeaderCallback = this._serverConfig.getHeaderCallback;

    this._finalizationRegistry =
      new FinalizationRegistry(this.automaticCleanup);

    if (this._serverConfig.deleteOnDeref !== undefined) {
      this._finalizationRegistry.register(this._serverConfig.deleteOnDeref, this);
      this._serverConfig.deleteOnDeref = undefined; // Don't keep a strong reference to the object.
    }
  }

  private automaticCleanup(serverApp: FirebaseServerAppImpl): void {
    void deleteApp(serverApp);
  }

  get serverAppConfig(): FirebaseServerAppSettings {
    this.checkDestroyed();
    return this._serverConfig;
  }

  invokeSetCookieCallback(cookieName: string, cookieValue: string): void {
    this.checkDestroyed();
    if (this._setCookieCallback !== undefined) {
      this._setCookieCallback(cookieName, cookieValue);
    }
  }

  invokeGetCookieCallback(cookieName: string): string | undefined {
    this.checkDestroyed();
    if (this._getCookieCallback !== undefined) {
      return this._getCookieCallback(cookieName);
    }
  }

  invokeGetHeaderCallback(headerName: string): string | undefined {
    this.checkDestroyed();
    if (this._getHeaderCallback !== undefined) {
      return this._getHeaderCallback(headerName);
    }
  }
}

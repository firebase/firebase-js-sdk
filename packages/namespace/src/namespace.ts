/**
 * Copyright 2017 Google Inc.
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

import { FirebaseApp } from '@firebase/app';
import { FirebaseOptions, FirebaseAppConfig } from '@firebase/app-types';

namespace firebase {
  const appsByName: { [appName: string]: FirebaseApp } = {};

  /**
   * This export is purely for type purposes the actual implementation is done
   * w/ the `Object.defineProperty` that follows
   */
  export let apps: FirebaseApp[];
  Object.defineProperty(firebase, 'apps', {
    get: () => Object.keys(appsByName).map(appName => appsByName[appName])
  });

  export function app(name: string = '[DEFAULT]') {
    if (appsByName[name]) {
      return appsByName[name];
    } else {
      throw new Error('no-app');
    }
  }

  export const SDK_VERSION = '${FIREBASE_SDK_VERSION}';

  export function initializeApp(
    options: FirebaseOptions,
    name?: string
  ): FirebaseApp;
  export function initializeApp(
    options: FirebaseOptions,
    config?: FirebaseAppConfig
  ): FirebaseApp;
  export function initializeApp(
    options: FirebaseOptions,
    arg: any = {}
  ): FirebaseApp {
    let name: string, adce: boolean;

    /**
     * If we are passed null, convert it to a null string and handle it with the
     * error handling downstream
     */
    if (arg === null) {
      arg = '';
    }

    switch (typeof arg) {
      case 'string':
        name = arg as string;
        break;
      case 'object':
        const config = arg as FirebaseAppConfig;
        name = config.name;
        adce = config.automaticDataCollectionEnabled;
        break;
    }

    const app = new FirebaseApp(options, name);

    if (adce) {
      app.automaticDataCollectionEnabled = adce;
    }

    if (appsByName[app.name]) {
      throw new Error('app-exists');
    } else {
      appsByName[app.name] = app;
      app.event$.subscribe(evt => {
        if (evt.type === 'deleted') {
          delete appsByName[app.name];
        }
      });
    }

    return app;
  }

  /**
   * Resets the namespace (test only)
   * @internal
   */
  export function __reset() {
    Object.keys(appsByName).forEach(key => {
      delete appsByName[key];
    });
  }
}

export default firebase;

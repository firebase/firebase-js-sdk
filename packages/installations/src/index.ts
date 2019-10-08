/**
 * @license
 * Copyright 2019 Google Inc.
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

import firebase from '@firebase/app';
import {
  _FirebaseNamespace,
  FirebaseServiceFactory
} from '@firebase/app-types/private';
import { FirebaseInstallations } from '@firebase/installations-types';

import { deleteInstallation, getId, getToken } from './functions';
import { extractAppConfig } from './helpers/extract-app-config';

export function registerInstallations(instance: _FirebaseNamespace): void {
  const installationsName = 'installations';

  const factoryMethod: FirebaseServiceFactory = app => {
    // Throws if app isn't configured properly.
    extractAppConfig(app);

    return {
      app,
      getId: () => getId(app),
      getToken: (forceRefresh?: boolean) => getToken(app, forceRefresh),
      delete: () => deleteInstallation(app)
    };
  };

  instance.INTERNAL.registerService(installationsName, factoryMethod);
}

registerInstallations(firebase as _FirebaseNamespace);

/**
 * Define extension behavior of `registerInstallations`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    installations(app?: FirebaseApp): FirebaseInstallations;
  }
  interface FirebaseApp {
    installations(): FirebaseInstallations;
  }
}

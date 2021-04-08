/**
 * @license
 * Copyright 2017 Google LLC
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

// eslint-disable-next-line import/no-extraneous-dependencies
import firebase from '@firebase/app';
import { FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType } from '@firebase/component';
import * as types from '@firebase/database-types';
import { isNodeSdk } from '@firebase/util';

import { name, version } from './package.json';
import { Database } from './src/api/Database';
import * as INTERNAL from './src/api/internal';
import { DataSnapshot, Query, Reference } from './src/api/Reference';
import * as TEST_ACCESS from './src/api/test_access';
import { setSDKVersion } from './src/core/version';
import { enableLogging, repoManagerDatabaseFromApp } from './src/exp/Database';

const ServerValue = Database.ServerValue;

export function registerDatabase(instance: FirebaseNamespace) {
  // set SDK_VERSION
  setSDKVersion(instance.SDK_VERSION);

  // Register the Database Service with the 'firebase' namespace.
  const namespace = (instance as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'database',
      (container, { instanceIdentifier: url }) => {
        /* Dependencies */
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const authProvider = container.getProvider('auth-internal');
        return new Database(
          repoManagerDatabaseFromApp(app, authProvider, url),
          app
        );
      },
      ComponentType.PUBLIC
    )
      .setServiceProps(
        // firebase.database namespace properties
        {
          Reference,
          Query,
          Database,
          DataSnapshot,
          enableLogging,
          INTERNAL,
          ServerValue,
          TEST_ACCESS
        }
      )
      .setMultipleInstances(true)
  );

  instance.registerVersion(name, version);

  if (isNodeSdk()) {
    module.exports = namespace;
  }
}

registerDatabase(firebase);

// Types to export for the admin SDK
export { Database, Query, Reference, enableLogging, ServerValue };

export { DataSnapshot } from './src/api/Reference';
export { OnDisconnect } from './src/api/onDisconnect';

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    database?: {
      (app?: FirebaseApp): types.FirebaseDatabase;
      enableLogging: typeof types.enableLogging;
      ServerValue: types.ServerValue;
      Database: typeof types.FirebaseDatabase;
    };
  }
  interface FirebaseApp {
    database?(databaseURL?: string): types.FirebaseDatabase;
  }
}

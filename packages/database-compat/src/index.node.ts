/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';
import { Component, ComponentType } from '@firebase/component';
import { enableLogging } from '@firebase/database';
import * as types from '@firebase/database-types';
import { CONSTANTS, isNodeSdk } from '@firebase/util';

import { name, version } from '../package.json';
import { Database } from '../src/api/Database';
import * as INTERNAL from '../src/api/internal';
import { DataSnapshot, Query, Reference } from '../src/api/Reference';

const ServerValue = Database.ServerValue;

/**
 * A one off register function which returns a database based on the app and
 * passed database URL. (Used by the Admin SDK)
 *
 * @param app - A valid FirebaseApp-like object
 * @param url - A valid Firebase databaseURL
 * @param version - custom version e.g. firebase-admin version
 * @param nodeAdmin - true if the SDK is being initialized from Firebase Admin.
 */
export function initStandalone(
  app: FirebaseApp,
  url: string,
  version: string,
  nodeAdmin = true
) {
  CONSTANTS.NODE_ADMIN = nodeAdmin;
  return INTERNAL.initStandalone({
    app,
    url,
    version,
    // firebase-admin-node's app.INTERNAL implements FirebaseAuthInternal interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customAuthImpl: (app as any).INTERNAL as FirebaseAuthInternal,
    namespace: {
      Reference,
      Query,
      Database,
      DataSnapshot,
      enableLogging,
      INTERNAL,
      ServerValue
    },
    nodeAdmin
  });
}

export function registerDatabase(instance: FirebaseNamespace) {
  // Register the Database Service with the 'firebase' namespace.
  const namespace = (instance as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component(
      'database-compat',
      (container, { instanceIdentifier: url }) => {
        /* Dependencies */
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app-compat').getImmediate();
        const databaseExp = container
          .getProvider('database')
          .getImmediate({ identifier: url });
        return new Database(databaseExp, app);
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
          ServerValue
        }
      )
      .setMultipleInstances(true)
  );

  instance.registerVersion(name, version, 'node');

  if (isNodeSdk()) {
    module.exports = Object.assign({}, namespace, { initStandalone });
  }
}

try {
  // If @firebase/app is not present, skip registering database.
  // It could happen when this package is used in firebase-admin which doesn't depend on @firebase/app.
  // Previously firebase-admin depends on @firebase/app, which causes version conflict on
  // @firebase/app when used together with the js sdk. More detail:
  // https://github.com/firebase/firebase-js-sdk/issues/1696#issuecomment-501546596
  // eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-require-imports
  const firebase = require('@firebase/app-compat').default;
  registerDatabase(firebase);
} catch (err) {
  // catch and ignore 'MODULE_NOT_FOUND' error in firebase-admin context
  // we can safely ignore this error because RTDB in firebase-admin works without @firebase/app
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

// Types to export for the admin SDK
export { Database, Query, Reference, enableLogging, ServerValue };

export { OnDisconnect } from '@firebase/database';

declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    database?: {
      (app?: FirebaseApp): types.FirebaseDatabase;
      enableLogging: typeof types.enableLogging;
      ServerValue: types.ServerValue;
      Database: typeof types.FirebaseDatabase;
    };
  }
  interface FirebaseApp {
    database?(): types.FirebaseDatabase;
  }
}
export { DataSnapshot } from '../src/api/Reference';

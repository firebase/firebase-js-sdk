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

// eslint-disable-next-line import/no-extraneous-dependencies
import firebase, { FirebaseNamespace } from '@firebase/app-compat';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType } from '@firebase/component';
import { enableLogging } from '@firebase/database';
import * as types from '@firebase/database-types';

import { name, version } from '../package.json';
import { Database } from '../src/api/Database';
import * as INTERNAL from '../src/api/internal';
import { DataSnapshot, Query, Reference } from '../src/api/Reference';

const ServerValue = Database.ServerValue;

export function registerDatabase(instance: FirebaseNamespace) {
  // Register the Database Service with the 'firebase' namespace.
  const namespace = (
    instance as unknown as _FirebaseNamespace
  ).INTERNAL.registerComponent(
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

  instance.registerVersion(name, version);
}

registerDatabase(firebase);

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
    database?(databaseURL?: string): types.FirebaseDatabase;
  }
}

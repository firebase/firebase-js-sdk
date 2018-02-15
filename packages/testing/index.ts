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

import firebase from '@firebase/app';
import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import {
  FirebaseServiceFactory,
  _FirebaseNamespace
} from '@firebase/app-types/private';
import { isNodeSdk } from '@firebase/util';
import * as types from '@firebase/testing-types';

import { Database } from './src/api/database';

export class Testing implements types.FirebaseTesting {
  private app_: FirebaseApp;

  constructor(app: FirebaseApp) {
    this.app_ = app;
  }

  get app(): FirebaseApp {
    return this.app_;
  }

  database(): types.FirebaseDatabaseTesting {
    return new Database();
  }
}

export function registerTesting(instance: FirebaseNamespace) {
  const namespace = (instance as _FirebaseNamespace).INTERNAL.registerService(
    /* name */
    'testing',
    /* createService: FirebaseServiceFactory */
    ((app: FirebaseApp, unused: any, opt_url?: string) =>
      new Testing(app)) as FirebaseServiceFactory,
    /* serviceProperties?: { [prop: string]: any } */
    {
      Database
    },
    /* appHook?: AppHook */
    null,
    /* allowMultipleInstances?: boolean */
    true
  );

  if (isNodeSdk()) {
    module.exports = namespace;
  }
}

registerTesting(firebase);

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    testing?: {
      (app?: FirebaseApp): types.FirebaseTesting;
      database: typeof types.FirebaseDatabaseTesting;
    };
  }
  interface FirebaseApp {
    testing?(): types.FirebaseTesting;
  }
}

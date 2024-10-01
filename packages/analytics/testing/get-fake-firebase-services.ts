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

import { FirebaseApp, initializeApp, _registerComponent, _addOrOverwriteComponent } from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { AnalyticsService } from '../src/factory';

const fakeConfig = {
  projectId: 'projectId',
  authDomain: 'authDomain',
  messagingSenderId: 'messagingSenderId',
  databaseURL: 'databaseUrl',
  storageBucket: 'storageBucket'
};

export function getFakeApp(fakeAppParams?: {
  appId?: string;
  apiKey?: string;
  measurementId?: string;
}): FirebaseApp {
  return {
    name: 'appName',
    options: { ...fakeConfig, ...fakeAppParams },
    automaticDataCollectionEnabled: true
  };
}

export function getFakeInstallations(
  fid: string = 'fid-1234',
  // eslint-disable-next-line @typescript-eslint/ban-types
  onFidResolve?: Function
): _FirebaseInstallationsInternal {
  return {
    getId: async () => {
      onFidResolve && onFidResolve();
      return fid;
    },
    getToken: async () => 'authToken'
  };
}

export function getFullApp(fakeAppParams?: {
  appId?: string;
  apiKey?: string;
  measurementId?: string;
}): FirebaseApp {
  _registerComponent(
    new Component(
      'installations-internal',
      () => {
        return {} as _FirebaseInstallationsInternal;
      },
      ComponentType.PUBLIC
    )
  );
  _registerComponent(
    new Component(
      'analytics',
      () => {
        return {} as AnalyticsService;
      },
      ComponentType.PUBLIC
    )
  );
  const app = initializeApp({ ...fakeConfig, ...fakeAppParams });
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
    new Component(
      'heartbeat',
      () => {
        return {
          triggerHeartbeat: () => {}
        } as any;
      },
      ComponentType.PUBLIC
    )
  );
  return app;
}

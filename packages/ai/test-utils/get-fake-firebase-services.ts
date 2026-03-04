/**
 * @license
 * Copyright 2025 Google LLC
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
  FirebaseApp,
  initializeApp,
  _registerComponent,
  _addOrOverwriteComponent
} from '@firebase/app';
import { Component, ComponentType, InstanceFactory } from '@firebase/component';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';
import { AI_TYPE } from '../src/constants';
import { factory as factoryNode } from '../src/factory-node';
import { ChromeAdapter, InferenceMode } from '../src/types';

const fakeConfig = {
  projectId: 'projectId',
  authDomain: 'authDomain',
  messagingSenderId: 'messagingSenderId',
  databaseURL: 'databaseUrl',
  storageBucket: 'storageBucket'
};

export function getFullApp(
  fakeAppParams?: {
    appId?: string;
    apiKey?: string;
  },
  factory: InstanceFactory<'AI'> = factoryNode
): FirebaseApp {
  _registerComponent(
    new Component(AI_TYPE, factory, ComponentType.PUBLIC).setMultipleInstances(
      true
    )
  );
  _registerComponent(
    new Component(
      'app-check-internal',
      () => {
        return {} as FirebaseAppCheckInternal;
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
      // @ts-ignore
      () => {
        return {
          triggerHeartbeat: () => {}
        };
      },
      ComponentType.PUBLIC
    )
  );
  return app;
}

export const fakeChromeAdapter: ChromeAdapter = {
  mode: InferenceMode.PREFER_ON_DEVICE,
  // Individual tests may stub this to resolve true as needed.
  isAvailable: () => Promise.resolve(false),
  generateContent: () => Promise.resolve({} as Response),
  generateContentStream: () => Promise.resolve({} as Response),
  countTokens: () => Promise.resolve({} as Response)
};

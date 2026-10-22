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

import { getModularInstance } from '@firebase/util';
import { getApp, getApps } from '@firebase/app';
import firebase from '@firebase/app-compat';

import { TEST_PROJECT_CONFIG } from './util';
//TODO: add Storage, Firestore and Database tests once v8 is removed. Currently it's too difficult to set them up in integration tests.
describe('App compat interop', () => {
  afterEach(() => {
    const deletePromises = [];
    for (const app of firebase.apps) {
      deletePromises.push(app.delete());
    }

    return Promise.all(deletePromises);
  });

  it('App compat instance references modular App instance', () => {
    const compatApp = firebase.initializeApp(TEST_PROJECT_CONFIG);
    const modularApp = getApp();
    expect(getModularInstance(compatApp)).toBe(modularApp);
  });

  it('deleting compat app deletes modular app', async () => {
    const compatApp = firebase.initializeApp(TEST_PROJECT_CONFIG);
    expect(firebase.apps.length).toBe(1);
    expect(getApps().length).toBe(1);

    await compatApp.delete();
    expect(firebase.apps.length).toBe(0);
    expect(getApps().length).toBe(0);
  });
});

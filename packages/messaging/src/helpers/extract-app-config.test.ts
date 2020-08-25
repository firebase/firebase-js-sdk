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

import '../testing/setup';

import { AppConfig } from '../interfaces/app-config';
import { FirebaseApp } from '@firebase/app-types';
import { expect } from 'chai';
import { extractAppConfig } from './extract-app-config';
import { getFakeApp } from '../testing/fakes/firebase-dependencies';

describe('extractAppConfig', () => {
  it('returns AppConfig if the argument is a FirebaseApp object that includes an appId', () => {
    const firebaseApp = getFakeApp();
    const expected: AppConfig = {
      appName: 'appName',
      apiKey: 'apiKey',
      projectId: 'projectId',
      appId: '1:777777777777:web:d93b5ca1475efe57',
      senderId: '1234567890'
    };
    expect(extractAppConfig(firebaseApp)).to.deep.equal(expected);
  });

  it('throws if a necessary value is missing', () => {
    expect(() =>
      extractAppConfig((undefined as unknown) as FirebaseApp)
    ).to.throw('Missing App configuration value: "App Configuration Object"');

    let firebaseApp = getFakeApp();
    // @ts-expect-error
    delete firebaseApp.options;
    expect(() => extractAppConfig(firebaseApp)).to.throw(
      'Missing App configuration value: "App Configuration Object"'
    );

    firebaseApp = getFakeApp();
    // @ts-expect-error
    delete firebaseApp.name;
    expect(() => extractAppConfig(firebaseApp)).to.throw(
      'Missing App configuration value: "App Name"'
    );

    firebaseApp = getFakeApp();
    delete firebaseApp.options.projectId;
    expect(() => extractAppConfig(firebaseApp)).to.throw(
      'Missing App configuration value: "projectId"'
    );

    firebaseApp = getFakeApp();
    delete firebaseApp.options.apiKey;
    expect(() => extractAppConfig(firebaseApp)).to.throw(
      'Missing App configuration value: "apiKey"'
    );

    firebaseApp = getFakeApp();
    delete firebaseApp.options.appId;
    expect(() => extractAppConfig(firebaseApp)).to.throw(
      'Missing App configuration value: "appId"'
    );

    firebaseApp = getFakeApp();
    delete firebaseApp.options.messagingSenderId;
    expect(() => extractAppConfig(firebaseApp)).to.throw(
      'Missing App configuration value: "messagingSenderId"'
    );
  });
});

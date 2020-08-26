/**
 * @license
 * Copyright 2020 Google LLC
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
import '../../index.ts';
import '../setup';
import { expect } from 'chai';
import { stub } from 'sinon';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../../../config/project.json');

describe('FirebaseAnalytics Integration Tests', () => {
  it('logEvent() sends correct network request.', async () => {
    const app = firebase.initializeApp(config);
    app.analytics().logEvent('login');
    await new Promise(resolve => setTimeout(resolve, 10000));
    const resources = performance.getEntriesByType('resource');
    resources.forEach(resource => console.log(resource.name));
    await app.delete();
  });
  it("Warns if measurement ID doesn't match.", done => {
    const warnStub = stub(console, 'warn').callsFake(() => {
      expect(warnStub.args[0][1]).to.include('does not match');
      done();
    });
    const app = firebase.initializeApp({
      ...config,
      measurementId: 'wrong-id'
    });
    app.analytics();
  });
});

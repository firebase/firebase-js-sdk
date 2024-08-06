/**
 * @license
 * Copyright 2024 Google LLC
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

import { deleteApp, initializeApp } from '@firebase/app';
import { expect } from 'chai';

import { getDataConnect } from '../../src';

describe('Data Connect Test', () => {
  it('should throw an error if `projectId` is not provided', async () => {
    const app = initializeApp({ projectId: undefined }, 'a');
    expect(() =>
      getDataConnect(app, { connector: 'c', location: 'l', service: 's' })
    ).to.throw(
      'Project ID must be provided. Did you pass in a proper projectId to initializeApp?'
    );
    await deleteApp(app);
  });
  it('should not throw an error if `projectId` is provided', async () => {
    const projectId = 'p';
    const testApp = initializeApp({ projectId }, 'p');
    expect(() =>
      getDataConnect(testApp, { connector: 'c', location: 'l', service: 's' })
    ).to.not.throw(
      'Project ID must be provided. Did you pass in a proper projectId to initializeApp?'
    );
    const dc = getDataConnect(testApp, { connector: 'c', location: 'l', service: 's' });
    expect(dc.app.options.projectId).to.eq(projectId);
    await deleteApp(testApp);
  });
  it('should throw an error if `connectorConfig` is not provided', async () => {
    const projectId = 'p';
    const testApp = initializeApp({ projectId }, 'p');
    // @ts-ignore
    expect(() => getDataConnect(testApp, undefined)).to.throw(
      'DC Option Required'
    );
    const dc = getDataConnect(testApp, { connector: 'c', location: 'l', service: 's' });
    expect(dc.app.options.projectId).to.eq(projectId);
    await deleteApp(testApp);
  });
});

/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect } from 'chai';

import { APPLICATION_ID_PARAM } from '../src/realtime/Constants';
import { WebSocketConnection } from '../src/realtime/WebSocketConnection';

import { testRepoInfo } from './helpers/util';

describe('WebSocketConnection', () => {
  it('should add an applicationId to the query parameter', () => {
    const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');
    const applicationId = 'myID';
    const websocketConnection = new WebSocketConnection(
      'connId',
      repoInfo,
      applicationId
    );
    const searchParams = new URL(websocketConnection.connURL).searchParams;
    expect(searchParams.get(APPLICATION_ID_PARAM)).to.equal(applicationId);
  });
  it('should not add an applicationId to the query parameter if applicationId is empty', () => {
    const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');
    const applicationId = '';
    const websocketConnection = new WebSocketConnection(
      'connId',
      repoInfo,
      applicationId
    );
    const searchParams = new URL(websocketConnection.connURL).searchParams;
    expect(searchParams.get(APPLICATION_ID_PARAM)).to.be.null;
  });
});

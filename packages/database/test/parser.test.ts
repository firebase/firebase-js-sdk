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

import { parseRepoInfo } from '../src/core/util/libs/parser';

describe('parser', () => {
  it('should set websocketUrl correctly based on the protocol', () => {
    const httpsRepoInfo = parseRepoInfo(
      'https://test-ns.firebaseio.com',
      false
    );
    expect(httpsRepoInfo.repoInfo.webSocketOnly).to.equal(false);
    const wssRepoInfo = parseRepoInfo('wss://test-ns.firebaseio.com', false);
    expect(wssRepoInfo.repoInfo.webSocketOnly).to.equal(true);
    const wsRepoInfo = parseRepoInfo('ws://test-ns.firebaseio.com', false);
    expect(wsRepoInfo.repoInfo.webSocketOnly).to.equal(true);
  });
});

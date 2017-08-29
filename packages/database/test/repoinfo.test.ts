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

import { testRepoInfo } from './helpers/util';
import {
  LAST_SESSION_PARAM,
  LONG_POLLING,
  PROTOCOL_VERSION,
  VERSION_PARAM,
  WEBSOCKET
} from '../src/realtime/Constants';
import { expect } from 'chai';

describe('RepoInfo', function() {
  it('should return the correct URL', function() {
    const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');

    const urlParams = {};
    urlParams[VERSION_PARAM] = PROTOCOL_VERSION;
    urlParams[LAST_SESSION_PARAM] = 'test';

    const websocketUrl = repoInfo.connectionURL(WEBSOCKET, urlParams);
    expect(websocketUrl).to.equal(
      'wss://test-ns.firebaseio.com/.ws?v=5&ls=test'
    );

    const longPollingUrl = repoInfo.connectionURL(LONG_POLLING, urlParams);
    expect(longPollingUrl).to.equal(
      'https://test-ns.firebaseio.com/.lp?v=5&ls=test'
    );
  });
});

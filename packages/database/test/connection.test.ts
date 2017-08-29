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

import { expect } from 'chai';
import { TEST_PROJECT, testRepoInfo } from './helpers/util';
import { Connection } from '../src/realtime/Connection';

describe('Connection', () => {
  it('return the session id', function(done) {
    new Connection(
      '1',
      testRepoInfo(TEST_PROJECT.databaseURL),
      message => {},
      (timestamp, sessionId) => {
        expect(sessionId).not.to.be.null;
        expect(sessionId).not.to.equal('');
        done();
      },
      () => {},
      reason => {}
    );
  });

  // TODO(koss) - Flakey Test.  When Dev Tools is closed on my Mac, this test
  // fails about 20% of the time (open - it never fails).  In the failing
  // case a long-poll is opened first.
  it.skip('disconnect old session on new connection', function(done) {
    const info = testRepoInfo(TEST_PROJECT.databaseURL);
    new Connection(
      '1',
      info,
      message => {},
      (timestamp, sessionId) => {
        new Connection(
          '2',
          info,
          message => {},
          (timestamp, sessionId) => {},
          () => {},
          reason => {},
          sessionId
        );
      },
      () => {
        done(); // first connection was disconnected
      },
      reason => {}
    );
  });
});

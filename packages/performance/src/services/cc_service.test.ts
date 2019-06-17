/**
 * @license
 * Copyright 2019 Google Inc.
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

import { stub, useFakeTimers, SinonStub } from 'sinon';
import { use, expect } from 'chai';
import { Logger, LogLevel } from '@firebase/logger';
import * as sinonChai from 'sinon-chai';

use(sinonChai);

// We have to stub the clock before importing cc_service, otherwise we cannot deterministically
// trigger fetches.
// Starts date at timestamp 1 instead of 0, otherwise it causes validation errors.
const clock = useFakeTimers(1);
import { ccHandler } from './cc_service';

describe('Firebase Performance > cc_service', () => {
  after(() => {
    clock.restore();
  });

  describe('ccHandler', () => {
    let fetchStub: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
    const INITIAL_SEND_TIME_DELAY_MS = 5.5 * 1000;
    const DEFAULT_SEND_INTERVAL_MS = 10 * 1000;
    const testCCHandler = ccHandler((...args) => {
      return args[0];
    });

    beforeEach(() => {
      fetchStub = stub(window, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('throws an error when logging an empty message', () => {
      const logger = new Logger('@firebase/performance/cc');
      expect(() => {
        testCCHandler(logger, LogLevel.SILENT, '');
      }).to.throw;
    });

    it('does not attempt to log an event to clearcut after INITIAL_SEND_TIME_DELAY_MS if queue is empty', () => {
      fetchStub.resolves(
        new Response('', {
          status: 200,
          headers: { 'Content-type': 'application/json' }
        })
      );

      clock.tick(INITIAL_SEND_TIME_DELAY_MS);
      expect(fetchStub).to.not.have.been.called;
    });

    it('attempts to log an event to clearcut after DEFAULT_SEND_INTERVAL_MS if queue not empty', () => {
      const logger = new Logger('@firebase/performance/cc');

      fetchStub.resolves(
        new Response('', {
          status: 200,
          headers: { 'Content-type': 'application/json' }
        })
      );

      testCCHandler(logger, LogLevel.SILENT, 'someEvent');
      clock.tick(DEFAULT_SEND_INTERVAL_MS);
      expect(fetchStub).to.have.been.calledOnce;
    });
  });
});

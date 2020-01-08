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
import * as sinonChai from 'sinon-chai';

use(sinonChai);

// We have to stub the clock before importing transport_service, otherwise we cannot deterministically
// trigger fetches.
// Starts date at timestamp 1 instead of 0, otherwise it causes validation errors.
const clock = useFakeTimers(1);
import { transportHandler, setupTransportService } from './transport_service';

describe('Firebase Performance > transport_service', () => {
  let fetchStub: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
  const INITIAL_SEND_TIME_DELAY_MS = 5.5 * 1000;
  const DEFAULT_SEND_INTERVAL_MS = 10 * 1000;
  const testTransportHandler = transportHandler((...args) => {
    return args[0];
  });

  beforeEach(() => {
    fetchStub = stub(window, 'fetch');
    setupTransportService();
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('throws an error when logging an empty message', done => {
    expect(() => {
      testTransportHandler('');
    }).to.throw;
    done();
  });

  it('does not attempt to log an event to clearcut after INITIAL_SEND_TIME_DELAY_MS if queue is empty', done => {
    fetchStub.resolves(
      new Response('', {
        status: 200,
        headers: { 'Content-type': 'application/json' }
      })
    );

    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    expect(fetchStub).to.not.have.been.called;
    done();
  });

  it('attempts to log an event to clearcut after DEFAULT_SEND_INTERVAL_MS if queue not empty', done => {
    fetchStub.resolves(
      new Response('', {
        status: 200,
        headers: { 'Content-type': 'application/json' }
      })
    );

    testTransportHandler('someEvent');
    clock.tick(DEFAULT_SEND_INTERVAL_MS);
    expect(fetchStub).to.have.been.calledOnce;
    done();
  });
});

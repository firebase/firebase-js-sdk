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

import { stub, useFakeTimers, SinonStub, SinonFakeTimers, match } from 'sinon';
import { use, expect } from 'chai';
import * as sinonChai from 'sinon-chai';
import {
  transportHandler,
  setupTransportService,
  resetTransportService
} from './transport_service';
import { SettingsService } from './settings_service';

use(sinonChai);

describe('Firebase Performance > transport_service', () => {
  let fetchStub: SinonStub<[RequestInfo, RequestInit?], Promise<Response>>;
  const INITIAL_SEND_TIME_DELAY_MS = 5.5 * 1000;
  const DEFAULT_SEND_INTERVAL_MS = 10 * 1000;
  // Starts date at timestamp 1 instead of 0, otherwise it causes validation errors.
  let clock: SinonFakeTimers;
  const testTransportHandler = transportHandler((...args) => {
    return args[0];
  });

  beforeEach(() => {
    fetchStub = stub(window, 'fetch');
    clock = useFakeTimers(1);
    setupTransportService();
  });

  afterEach(() => {
    fetchStub.restore();
    clock.restore();
    resetTransportService();
  });

  it('throws an error when logging an empty message', () => {
    expect(() => {
      testTransportHandler('');
    }).to.throw;
  });

  it('does not attempt to log an event to cc after INITIAL_SEND_TIME_DELAY_MS if queue is empty', () => {
    fetchStub.resolves(
      new Response('', {
        status: 200,
        headers: { 'Content-type': 'application/json' }
      })
    );

    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    expect(fetchStub).to.not.have.been.called;
  });

  it('attempts to log an event to cc after DEFAULT_SEND_INTERVAL_MS if queue not empty', () => {
    fetchStub.resolves(
      new Response('', {
        status: 200,
        headers: { 'Content-type': 'application/json' }
      })
    );

    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    testTransportHandler('someEvent');
    clock.tick(DEFAULT_SEND_INTERVAL_MS);
    expect(fetchStub).to.have.been.calledOnce;
  });

  it('successful send a meesage to transport', () => {
    const transportDelayInterval = 30000;
    const setting = SettingsService.getInstance();
    const flTransportFullUrl =
      setting.flTransportEndpointUrl + '?key=' + setting.transportKey;
    fetchStub.withArgs(flTransportFullUrl, match.any).resolves(
      // DELETE_REQUEST means event dispatch is successful.
      new Response(
        '{\
        "nextRequestWaitMillis": "' +
          transportDelayInterval +
          '",\
        "logResponseDetails": [\
          {\
            "responseAction": "DELETE_REQUEST"\
          }\
        ]\
      }',
        {
          status: 200,
          headers: { 'Content-type': 'application/json' }
        }
      )
    );

    testTransportHandler('event1');
    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    expect(fetchStub).to.have.been.calledOnce;
  });
});

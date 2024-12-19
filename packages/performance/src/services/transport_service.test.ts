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

import { stub, useFakeTimers, SinonFakeTimers, SinonStub } from 'sinon';
import { use, expect } from 'chai';
import sinonChai from 'sinon-chai';
import {
  transportHandler,
  setupTransportService,
  resetTransportService
} from './transport_service';
import { SettingsService } from './settings_service';

use(sinonChai);

/* eslint-disable no-restricted-properties */
describe('Firebase Performance > transport_service', () => {
  let sendBeaconStub: SinonStub<[url: string | URL, data?: BodyInit | null | undefined], boolean>;
  let fetchStub: SinonStub<[RequestInfo | URL, RequestInit?], Promise<Response>>;
  const INITIAL_SEND_TIME_DELAY_MS = 5.5 * 1000;
  const DEFAULT_SEND_INTERVAL_MS = 10 * 1000;
  const MAX_EVENT_COUNT_PER_REQUEST = 1000;
  // Starts date at timestamp 1 instead of 0, otherwise it causes validation errors.
  let clock: SinonFakeTimers;
  const testTransportHandler = transportHandler((...args) => {
    return args[0];
  });

  beforeEach(() => {
    clock = useFakeTimers(1);
    setupTransportService();
    sendBeaconStub = stub(navigator, 'sendBeacon');
    sendBeaconStub.returns(true);
    fetchStub = stub(window, 'fetch');
  });

  afterEach(() => {
    clock.restore();
    resetTransportService();
    sendBeaconStub.restore();
    fetchStub.restore();
  });

  it('throws an error when logging an empty message', () => {
    expect(() => {
      testTransportHandler('');
    }).to.throw;
  });

  it('does not attempt to log an event after INITIAL_SEND_TIME_DELAY_MS if queue is empty', () => {
    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    expect(sendBeaconStub).to.not.have.been.called;
    expect(fetchStub).to.not.have.been.called;
  });

  it('attempts to log an event after DEFAULT_SEND_INTERVAL_MS if queue not empty', async () => {
    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    testTransportHandler('someEvent');
    clock.tick(DEFAULT_SEND_INTERVAL_MS);
    expect(sendBeaconStub).to.have.been.calledOnce;
    expect(fetchStub).to.not.have.been.called;
  });

  it('successful send a message to transport', () => {
    testTransportHandler('event1');
    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    expect(sendBeaconStub).to.have.been.calledOnce;
    expect(fetchStub).to.not.have.been.called;
  });

  it('sends up to the maximum event limit in one request', async () => {
    // Arrange
    const setting = SettingsService.getInstance();
    const flTransportFullUrl =
      setting.flTransportEndpointUrl + '?key=' + setting.transportKey;

    // Act
    // Generate 1020 events, which should be dispatched in two batches (1000 events and 20 events).
    for (let i = 0; i < 1020; i++) {
      testTransportHandler('event' + i);
    }
    // Wait for first and second event dispatch to happen.
    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    // This is to resolve the floating promise chain in transport service.
    await Promise.resolve().then().then().then();
    clock.tick(DEFAULT_SEND_INTERVAL_MS);

    // Assert
    // Expects the first logRequest which contains first 1000 events.
    const firstLogRequest = generateLogRequest('5501');
    for (let i = 0; i < MAX_EVENT_COUNT_PER_REQUEST; i++) {
      firstLogRequest['log_event'].push({
        'source_extension_json_proto3': 'event' + i,
        'event_time_ms': '1'
      });
    }
    expect(sendBeaconStub).which.to.have.been.calledWith(
      flTransportFullUrl,
      JSON.stringify(firstLogRequest)
    );
    // Expects the second logRequest which contains remaining 20 events;
    const secondLogRequest = generateLogRequest('15501');
    for (let i = 0; i < 20; i++) {
      secondLogRequest['log_event'].push({
        'source_extension_json_proto3':
          'event' + (MAX_EVENT_COUNT_PER_REQUEST + i),
        'event_time_ms': '1'
      });
    }
    expect(sendBeaconStub).calledWith(
      flTransportFullUrl,
      JSON.stringify(secondLogRequest)
    );
    expect(fetchStub).to.not.have.been.called;
  });

  it('falls back to fetch if sendBeacon fails.', async () => {
    sendBeaconStub.returns(false);
    fetchStub.resolves(new Response('{}', {
      status: 200,
      headers: { 'Content-type': 'application/json' }
    }));
    testTransportHandler('event1');
    clock.tick(INITIAL_SEND_TIME_DELAY_MS);
    expect(fetchStub).to.have.been.calledOnce;
  });

  function generateLogRequest(requestTimeMs: string): any {
    return {
      'request_time_ms': requestTimeMs,
      'client_info': {
        'client_type': 1,
        'js_client_info': {}
      },
      'log_source': 462,
      'log_event': [] as any
    };
  }
});

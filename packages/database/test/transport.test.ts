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

import { CONSTANTS } from '@firebase/util';
import { expect } from 'chai';

import { forceLongPolling, forceWebSockets } from '../src';
import { BrowserPollConnection } from '../src/realtime/BrowserPollConnection';
import { TransportManager } from '../src/realtime/TransportManager';
import { WebSocketConnection } from '../src/realtime/WebSocketConnection';

const transportInitError =
  'Transport has already been initialized. Please call this function before calling ref or setting up a listener';
describe('Force Transport', () => {
  const oldNodeValue = CONSTANTS.NODE_CLIENT;
  beforeEach(() => {
    CONSTANTS.NODE_CLIENT = false;
  });
  afterEach(() => {
    // Resetting to old values
    TransportManager.globalTransportInitialized_ = false;
    CONSTANTS.NODE_CLIENT = oldNodeValue;
    BrowserPollConnection.forceAllow_ = false;
    BrowserPollConnection.forceDisallow_ = true;
    WebSocketConnection.forceDisallow_ = false;
  });
  it('should enable websockets and disable longPolling', () => {
    expect(forceWebSockets).to.not.throw();
    expect(WebSocketConnection.isAvailable()).to.equal(true);
    expect(BrowserPollConnection.isAvailable()).to.equal(false);
  });
  it('should throw an error when calling forceWebsockets() if TransportManager has already been initialized', () => {
    TransportManager.globalTransportInitialized_ = true;
    expect(forceWebSockets).to.throw(transportInitError);
    expect(WebSocketConnection.isAvailable()).to.equal(true);
    expect(BrowserPollConnection.isAvailable()).to.equal(false);
  });
  it('should enable longPolling and disable websockets', () => {
    expect(forceLongPolling).to.not.throw();
    expect(WebSocketConnection.isAvailable()).to.equal(false);
    expect(BrowserPollConnection.isAvailable()).to.equal(true);
  });
  it('should throw an error when calling forceLongPolling() if TransportManager has already been initialized', () => {
    TransportManager.globalTransportInitialized_ = true;
    expect(forceLongPolling).to.throw(transportInitError);
    expect(WebSocketConnection.isAvailable()).to.equal(true);
    expect(BrowserPollConnection.isAvailable()).to.equal(false);
  });
});

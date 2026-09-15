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

import { Logger } from '@firebase/logger';
import { CONSTANTS } from '@firebase/util';
import { forceLongPolling, forceWebSockets } from '../src';
import { BrowserPollConnection } from '../src/realtime/BrowserPollConnection';
import { TransportManager } from '../src/realtime/TransportManager';
import { WebSocketConnection } from '../src/realtime/WebSocketConnection';
import { vi, MockInstance } from 'vitest';

const transportInitError =
  'Transport has already been initialized. Please call this function before calling ref or setting up a listener';
describe('Force Transport', () => {
  const oldNodeValue = CONSTANTS.NODE_CLIENT;
  let spyWarn: MockInstance;
  beforeEach(() => {
    CONSTANTS.NODE_CLIENT = false;
    spyWarn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    // Resetting to old values
    TransportManager.globalTransportInitialized_ = false;
    CONSTANTS.NODE_CLIENT = oldNodeValue;
    BrowserPollConnection.forceAllow_ = false;
    BrowserPollConnection.forceDisallow_ = true;
    WebSocketConnection.forceDisallow_ = false;
    spyWarn.mockRestore();
  });
  // Fails without retry due to running tests in async
  it('should enable websockets and disable longPolling', () => {
    forceWebSockets();
    expect(spyWarn).not.toHaveBeenCalled();
    expect(WebSocketConnection.isAvailable()).toBe(true);
    expect(BrowserPollConnection.isAvailable()).toBe(false);
  });
  it('should throw an error when calling forceWebsockets() if TransportManager has already been initialized', () => {
    TransportManager.globalTransportInitialized_ = true;
    forceWebSockets();
    expect(spyWarn).toHaveBeenCalledWith(
      expect.stringContaining(transportInitError)
    );
    expect(WebSocketConnection.isAvailable()).toBe(true);
    expect(BrowserPollConnection.isAvailable()).toBe(false);
  });
  it('should enable longPolling and disable websockets', () => {
    forceLongPolling();
    expect(spyWarn).not.toHaveBeenCalled();
    expect(WebSocketConnection.isAvailable()).toBe(false);
    expect(BrowserPollConnection.isAvailable()).toBe(true);
  });
  it('should throw an error when calling forceLongPolling() if TransportManager has already been initialized', () => {
    TransportManager.globalTransportInitialized_ = true;
    forceLongPolling();
    expect(spyWarn).toHaveBeenCalledWith(
      expect.stringContaining(transportInitError)
    );
    expect(WebSocketConnection.isAvailable()).toBe(false);
    expect(BrowserPollConnection.isAvailable()).toBe(true);
  });
});

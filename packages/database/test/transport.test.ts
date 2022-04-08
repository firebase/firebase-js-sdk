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
import { WebSocketConnection } from '../src/realtime/WebSocketConnection';

describe('Force Transport', () => {
  it('should enable websockets and disable longPolling', () => {
    forceWebSockets();
    expect(WebSocketConnection.isAvailable()).to.equal(true);
    expect(BrowserPollConnection.isAvailable()).to.equal(false);
  });
  it('should enable longPolling and disable websockets', () => {
    CONSTANTS.NODE_CLIENT =  false;
    forceLongPolling();
    expect(WebSocketConnection.isAvailable()).to.equal(false);
    expect(BrowserPollConnection.isAvailable()).to.equal(true);
  });
});

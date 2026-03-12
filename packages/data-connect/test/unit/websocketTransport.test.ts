/**
 * @license
 * Copyright 2026 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnectOptions } from '../../src/api/DataConnect';
import { WebSocketTransport, initializeWebSocket } from '../../src/network/stream/websocket';

use(chaiAsPromised);
use(sinonChai);

class MockWebSocket {
  url: string;
  onopen?: () => void;
  onerror?: (err: unknown) => void;
  onmessage?: (ev: { data: string }) => void;
  onclose?: (ev: unknown) => void;
  readyState: number = WebSocket.CLOSED;

  static OPEN = WebSocket.OPEN;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void { }
  close(): void { }
}

describe('WebSocketTransport', () => {
  let transport: WebSocketTransport;
  let mockWebSockets: MockWebSocket[] = [];

  const testOptions: DataConnectOptions = {
    projectId: 'p',
    location: 'l',
    connector: 'c',
    service: 's'
  };

  let expectedUrl: string;

  beforeEach(() => {
    mockWebSockets = [];
    const fakeWebSocketImpl = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSockets.push(this);
      }
    } as unknown as typeof WebSocket;
    initializeWebSocket(fakeWebSocketImpl);

    transport = new WebSocketTransport(testOptions);
    expectedUrl = transport.endpointUrl;
  });

  afterEach(() => {
    for (const mockWebSocket of mockWebSockets) {
      mockWebSocket.close();
    }
    initializeWebSocket(globalThis.WebSocket);
    sinon.restore();
  });

  describe('openConnection / ensureConnection', () => {
    it('creates a new WebSocket with the correct URL', async () => {
      const connectionPromise = transport.openConnection();
      expect(mockWebSockets).to.have.lengthOf(1);
      const mockWebSocket = mockWebSockets[0];
      expect(mockWebSocket.url).to.equal(expectedUrl);

      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();

      await expect(connectionPromise).to.eventually.be.fulfilled;
      expect(transport.streamConnected).to.be.true;
    });

    it('rejects the promise if the WebSocket emits an error during open', async () => {
      const connectionPromise = transport.openConnection();
      expect(mockWebSockets).to.have.lengthOf(1);
      const mockWebSocket = mockWebSockets[0];

      mockWebSocket.onerror?.(new Error('connection failed!!!'));

      await expect(connectionPromise).to.eventually.be.rejectedWith(/Failed to open connection/);
      expect(transport.streamConnected).to.be.false;
    });

    it('returns the same promise if a connection attempt is ongoing', async () => {
      const connectionPromise1 = transport.openConnection();
      const connectionPromise2 = transport.openConnection();
      expect(mockWebSockets).to.have.lengthOf(1);
      const mockWebSocket = mockWebSockets[0];

      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();

      await expect(connectionPromise1).to.eventually.be.fulfilled;
      await expect(connectionPromise2).to.eventually.be.fulfilled;
    });

    it('returns immediately if the stream is already connected', async () => {
      const connectionPromise1 = transport.openConnection();
      const mockWebSocket = mockWebSockets[0];
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectionPromise1;

      const connectionPromise2 = transport.openConnection();
      await expect(connectionPromise2).to.eventually.be.fulfilled;
      expect(mockWebSockets).to.have.lengthOf(1);
    });
  });
});

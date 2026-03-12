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
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

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

interface WebSocketTransportWithInternals {
  openConnection(): Promise<void>;
  closeConnection(): Promise<void>;
  onConnectionReady(): void;
  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;
  endpointUrl: string;
  streamConnected: boolean;
  handleResponse(requestId: string, response: unknown): Promise<void>;
}

describe('WebSocketTransport', () => {
  let transport: WebSocketTransportWithInternals;
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

    transport = new WebSocketTransport(testOptions) as unknown as WebSocketTransportWithInternals;
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
      const onConnectionReadySpy = sinon.spy(transport, 'onConnectionReady');
      const connectionPromise = transport.openConnection();
      expect(mockWebSockets).to.have.lengthOf(1);
      const mockWebSocket = mockWebSockets[0];
      expect(mockWebSocket.url).to.equal(expectedUrl);

      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();

      await expect(connectionPromise).to.eventually.be.fulfilled;
      expect(transport.streamConnected).to.be.true;
      expect(onConnectionReadySpy).to.have.been.calledOnce;
    });

    it('rejects the promise if the WebSocket emits an error during open', async () => {
      const connectionPromise = transport.openConnection();
      expect(mockWebSockets).to.have.lengthOf(1);
      const mockWebSocket = mockWebSockets[0];

      mockWebSocket.onerror?.(new Error('connection failed!!!'));

      await expect(connectionPromise).to.eventually.be.rejectedWith('Failed to open connection');
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

  describe('closeConnection', () => {
    it('closes the connection correctly', async () => {
      const connectionPromise = transport.openConnection();
      const mockWebSocket = mockWebSockets[0];
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectionPromise;

      const closeStub = sinon.stub(mockWebSocket, 'close');

      await transport.closeConnection();
      expect(closeStub).to.have.been.calledOnce;
      expect(transport.streamConnected).to.be.false;
    });
  });

  describe('sendMessage', () => {
    it('opens connection if not open, then sends JSON stringified message', async () => {
      const variables = { foo: "bar" };
      const requestId = 'request-id';
      const request: DataConnectStreamRequest<typeof variables> = {
        execute: { operationName: 'testOp', variables },
        requestId
      };

      transport.sendMessage(request);

      expect(mockWebSockets).to.have.lengthOf(1);
      const mockWebSocket = mockWebSockets[0];
      const sendStub = sinon.stub(mockWebSocket, 'send');

      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sendStub).to.have.been.calledOnceWith(JSON.stringify(request));
    });
  });

  describe('handleWebSocketMessage', () => {
    it('parses incoming JSON and routes to handleResponse', async () => {
      const promise = transport.openConnection();
      const mockWebSocket = mockWebSockets[0];
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();
      await promise;

      const handleResponseStub = sinon.stub(transport, 'handleResponse').resolves();
      const expectedRequestId = 'request-id';
      const expectedData = { foo: 'bar' };
      const expectedExtensions = { dataConnect: [1, 2, 3] };
      const response = {
        result: {
          requestId: expectedRequestId,
          data: expectedData,
          extensions: expectedExtensions
        }
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(response) });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(handleResponseStub).to.have.been.calledOnce;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = handleResponseStub.args[0] as unknown as any[];
      const requestId = args[0];
      const result = args[1];
      expect(requestId).to.equal(expectedRequestId);
      expect(result.data).to.deep.equal(expectedData);
      expect(result.extensions).to.deep.equal(expectedExtensions);
    });

    it('throws if result is missing', async () => {
      const promise = transport.openConnection();
      const mockWebSocket = mockWebSockets[0];
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();
      await promise;

      const handleResponseStub = sinon.stub(transport, 'handleResponse').resolves();
      const expectedRequestId = 'request-id';
      const response = {
        requestId: expectedRequestId,
        abc: 'xyz'
      };

      await expect(mockWebSocket.onmessage?.({ data: JSON.stringify(response) })).to.be.rejectedWith(/server response did not include result/);
      expect(handleResponseStub).to.not.have.been.called;
    });

    it('throws if requestId is missing from result', async () => {
      const promise = transport.openConnection();
      const mockWebSocket = mockWebSockets[0];
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();
      await promise;

      const handleResponseStub = sinon.stub(transport, 'handleResponse').resolves();
      const expectedData = { foo: 'bar' };
      const response = {
        result: { data: expectedData }
      };

      await expect(mockWebSocket.onmessage?.({ data: JSON.stringify(response) })).to.be.rejectedWith(/server response did not include requestId/);
      expect(handleResponseStub).to.not.have.been.called;
    });
  });

  describe('handleDisconnect', () => {
    it('clears connection', async () => {
      const promise = transport.openConnection();
      const mockWebSocket = mockWebSockets[0];
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.onopen?.();
      await promise;
      expect(transport.streamConnected).to.be.true;
      mockWebSocket.onclose?.({} as unknown);
      expect(transport.streamConnected).to.be.false;
    });
  });
});

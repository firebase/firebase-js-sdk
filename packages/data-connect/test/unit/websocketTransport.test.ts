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

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnectOptions } from '../../src/api/DataConnect';
import { WebSocketTransport } from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

chai.use(sinonChai);
chai.use(chaiAsPromised);

/** Expose protected properties for testing */
class TestWebSocketTransport extends WebSocketTransport {
  testOpenConnection(): Promise<void> {
    return this.openConnection();
  }
  testCloseConnection(): Promise<void> {
    return this.closeConnection();
  }
  testSendMessage(req: DataConnectStreamRequest<unknown>): Promise<void> {
    return this.sendMessage(req);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobalWithWebSocket = any;

describe('WebSocketTransport', () => {
  const dcOptions: DataConnectOptions = {
    projectId: 'p',
    location: 'l',
    service: 's',
    connector: 'c'
  };

  let transport: TestWebSocketTransport;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webSocketMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalWebSocket: any;

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = (global as GlobalWithWebSocket).WebSocket;

    // Create a mock WebSocket instance
    webSocketMock = {
      readyState: 0, // CONNECTING
      send: sinon.spy(),
      close: sinon.spy(),
      onopen: null,
      onerror: null,
      onmessage: null,
      onclose: null
    };

    // Mock the WebSocket constructor
    (global as GlobalWithWebSocket).WebSocket = sinon.stub().returns(webSocketMock);
    (global as GlobalWithWebSocket).WebSocket.CONNECTING = 0;
    (global as GlobalWithWebSocket).WebSocket.OPEN = 1;
    (global as GlobalWithWebSocket).WebSocket.CLOSING = 2;
    (global as GlobalWithWebSocket).WebSocket.CLOSED = 3;

    transport = new TestWebSocketTransport(dcOptions);
  });

  afterEach(() => {
    // Restore original WebSocket
    if (originalWebSocket) {
      (global as GlobalWithWebSocket).WebSocket = originalWebSocket;
    } else {
      delete (global as GlobalWithWebSocket).WebSocket;
    }
    sinon.restore();
  });

  describe('openConnection', () => {
    it('should resolve when onopen fires', async () => {
      const openPromise = transport.testOpenConnection();
      
      // Simulate successful connection
      webSocketMock.readyState = 1; // OPEN
      if (webSocketMock.onopen) {
        webSocketMock.onopen();
      }

      await expect(openPromise).to.be.fulfilled;
    });

    it('should reject when onerror fires', async () => {
      const openPromise = transport.testOpenConnection();
      
      const testError = new Error('Test connection error');
      if (webSocketMock.onerror) {
        webSocketMock.onerror(testError);
      }

      await expect(openPromise).to.be.rejectedWith(/Failed to open connection/);
    });

    it('should return immediately if already connected', async () => {
      const openPromise1 = transport.testOpenConnection();
      webSocketMock.readyState = 1; // OPEN
      if (webSocketMock.onopen) {
        webSocketMock.onopen();
      }
      await openPromise1;

      // Reset mock constructor to ensure it's not called again
      (global as GlobalWithWebSocket).WebSocket.resetHistory();

      const openPromise2 = transport.testOpenConnection();
      await openPromise2;

      expect((global as GlobalWithWebSocket).WebSocket).to.not.have.been.called;
    });
  });

  describe('sendMessage', () => {
    it('should send stringified json payload', async () => {
      const payload: DataConnectStreamRequest<unknown> = {
        requestId: '1',
        execute: { operationName: 'testQuery' }
      };

      const sendPromise = transport.testSendMessage(payload);
      
      webSocketMock.readyState = 1; // OPEN
      if (webSocketMock.onopen) {
        webSocketMock.onopen();
      }
      
      await sendPromise;

      expect(webSocketMock.send).to.have.been.calledOnce;
      expect(webSocketMock.send).to.have.been.calledWith(JSON.stringify(payload));
    });
  });

  describe('_handleWebSocketMessage', () => {
    it('should correctly parse incoming JSON and handle response', async () => {
      // Use stub instead of spy to avoid testing base class logic regarding unknown requestIds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleResponseStub = sinon.stub(transport as any, 'handleResponse').resolves();

      // First open connection
      const openPromise = transport.testOpenConnection();
      webSocketMock.readyState = 1;
      if (webSocketMock.onopen) {
        webSocketMock.onopen();
      }
      await openPromise;

      // Simulate incoming message
      const incomingData = {
        result: {
          requestId: '1',
          data: { foo: 'bar' },
          errors: [],
          // Test strict mapping of extensions
          extensions: { dataConnect: [{ entityIds: ['id1'] }] }
        }
      };

      if (webSocketMock.onmessage) {
        await webSocketMock.onmessage({ data: JSON.stringify(incomingData) } as MessageEvent);
      }

      expect(handleResponseStub).to.have.been.calledOnce;
      const [calledRequestId, calledResponse] = handleResponseStub.firstCall.args;
      
      expect(calledRequestId).to.equal('1');
      expect(calledResponse.data).to.deep.equal({ foo: 'bar' });
      expect(calledResponse.errors).to.deep.equal([]);
      expect(calledResponse.extensions).to.deep.equal({ dataConnect: [{ entityIds: ['id1'] }] });
    });

    it('should map extensions to empty array if not strictly provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleResponseStub = sinon.stub(transport as any, 'handleResponse').resolves();

      const openPromise = transport.testOpenConnection();
      webSocketMock.readyState = 1;
      if (webSocketMock.onopen) {
        webSocketMock.onopen();
      }
      await openPromise;

      // Incoming message WITHOUT extensions field
      const incomingData = {
        result: {
          requestId: '2',
          data: { foo: 'bar' },
          errors: []
        }
      };

      if (webSocketMock.onmessage) {
        await webSocketMock.onmessage({ data: JSON.stringify(incomingData) } as MessageEvent);
      }

      expect(handleResponseStub).to.have.been.calledOnce;
      const calledResponse = handleResponseStub.firstCall.args[1];
      
      expect(calledResponse.extensions).to.deep.equal({ dataConnect: [] });
    });

    it('should throw if result or requestId is missing', async () => {
      const openPromise = transport.testOpenConnection();
      webSocketMock.readyState = 1;
      if (webSocketMock.onopen) {
        webSocketMock.onopen();
      }
      await openPromise;

      const invalidData1 = { foo: 'bar' }; // no result object
      const invalidData2 = { result: { foo: 'bar' } }; // no requestId

      let error1: unknown;
      try {
        await webSocketMock.onmessage({ data: JSON.stringify(invalidData1) } as MessageEvent);
      } catch (err: unknown) {
        error1 = err;
      }
      expect(error1).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error1 as any).message).to.include('message from stream did not include result');

      let error2: unknown;
      try {
        await webSocketMock.onmessage({ data: JSON.stringify(invalidData2) } as MessageEvent);
      } catch (err: unknown) {
        error2 = err;
      }
      expect(error2).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error2 as any).message).to.include('server response did not include requestId');
    });
  });
});

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
import * as logger from '../../src/logger';
import {
  WebSocketCloseCode,
  WebSocketTransport,
  initializeWebSocket
} from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';
import { DataConnectResponse } from '../../src/network/transport';

import { expectIsNotSettled, MockWebSocket } from './testUtils';

chai.use(sinonChai);
chai.use(chaiAsPromised);

/** Interface that exposes some private fields and methods of WebSocketTransport for testing purposes. */
interface TransportWithInternals {
  openConnection(): Promise<void>;
  closeConnection(): Promise<void>;
  sendMessage(req: DataConnectStreamRequest<unknown>): Promise<void>;
  connection: MockWebSocket | undefined;
  streamIsReady: boolean;
  handleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void>;
  rejectAllActiveRequests(error: Error): void;
}

describe('WebSocketTransport', () => {
  const dcOptions: DataConnectOptions = {
    projectId: 'p',
    location: 'l',
    service: 's',
    connector: 'c'
  };

  let transport: TransportWithInternals;

  beforeEach(() => {
    initializeWebSocket(MockWebSocket as unknown as typeof WebSocket);
    transport = new WebSocketTransport(
      dcOptions
    ) as unknown as TransportWithInternals;
  });

  afterEach(() => {
    initializeWebSocket(WebSocket);
    sinon.restore();
  });

  const connectionError = new Error('Test connection error');

  describe('openConnection', () => {
    it('should resolve when onopen fires', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      await transport.connection!.simulateOpen();
      await expect(openPromise).to.be.fulfilled;
    });

    it('should reject when onerror fires', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      await transport.connection!.simulateError(connectionError);
      await expect(openPromise).to.be.rejectedWith(/Failed to open connection/);
    });

    it('should de-duplicate calls when already connected', async () => {
      const openPromise1 = transport.openConnection();
      const onOpenSpy = sinon.spy(transport.connection!, 'onopen');
      await transport.connection!.simulateOpen();
      await openPromise1;
      const previousConnection = transport.connection;
      const openPromise2 = transport.openConnection();
      await openPromise2;
      expect(transport.connection).to.equal(previousConnection);
      expect(onOpenSpy).to.have.been.calledOnce;
    });

    it('should de-duplicate calls when open connection is pending', async () => {
      const openPromise1 = transport.openConnection();
      const onOpenSpy = sinon.spy(transport.connection!, 'onopen');
      await expectIsNotSettled(openPromise1);
      const openPromise2 = transport.openConnection();
      await expectIsNotSettled(openPromise2);
      await transport.connection!.simulateOpen();
      await expect(openPromise1).to.be.fulfilled;
      await expect(openPromise2).to.be.fulfilled;
      expect(onOpenSpy).to.have.been.calledOnce;
    });
  });

  describe('streamIsReady', () => {
    it('should be false initially', () => {
      expect(transport.streamIsReady).to.be.false;
    });

    it('should be false while connecting', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      expect(transport.streamIsReady).to.be.false;
    });

    it('should be true when connected', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      expect(transport.streamIsReady).to.be.true;
    });

    it('should be false after disconnected', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      await transport.connection!.simulateClose();
      expect(transport.streamIsReady).to.be.false;
    });
  });

  describe('closeConnection', () => {
    it('should close the underlying websocket and reset connection states', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      const mockWs = transport.connection!;
      await transport.closeConnection();
      expect(mockWs.close).to.have.been.calledOnce;
      expect(transport.connection).to.be.undefined;
    });

    it('should be idempotent if connection is already closed', async () => {
      await expect(transport.closeConnection()).to.be.fulfilled;
    });

    it('should return rejected promise and clean up if ws.close() throws', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      const mockWs = transport.connection!;
      mockWs.close = sinon.stub().throws(connectionError);
      await expect(transport.closeConnection()).to.be.rejectedWith(
        connectionError
      );
      expect(transport.connection).to.be.undefined;
    });
  });

  describe('onclose handler (handleWebsocketDisconnect)', () => {
    it('should reset connection state when websocket is closed externally', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      expect(transport.connection).to.not.be.undefined;
      // simulate server drop / unexpected closure
      await transport.connection!.simulateClose();
      expect(transport.connection).to.be.undefined;
    });

    it('should call rejectAllActiveRequests and clean up when closed externally', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      const rejectSpy = sinon.spy(transport, 'rejectAllActiveRequests');

      await transport.connection!.simulateClose();

      expect(rejectSpy).to.have.been.calledOnce;
      expect(rejectSpy.firstCall.args[0].message).to.equal(
        'WebSocket disconnected externally'
      );
    });
  });

  describe('sendMessage', () => {
    const payload: DataConnectStreamRequest<unknown> = {
      requestId: '1',
      execute: { operationName: 'testQuery' }
    };

    it('should not send until connection is open', async () => {
      const sendPromise = transport.sendMessage(payload);
      await expectIsNotSettled(sendPromise);
      await transport.connection!.simulateOpen();
      await sendPromise;
      expect(transport.connection!.send).to.have.been.calledOnce;
    });

    it('should send stringified json payload', async () => {
      const sendPromise = transport.sendMessage(payload);
      await transport.connection!.simulateOpen();
      await sendPromise;
      expect(transport.connection!.send).to.have.been.calledOnceWith(
        JSON.stringify(payload)
      );
    });
  });

  describe('handleWebSocketMessage', () => {
    let logErrorStub: sinon.SinonStub;
    beforeEach(() => {
      logErrorStub = sinon.stub(logger, 'logError');
    });

    const messageWithExtensions = {
      result: {
        requestId: '1',
        data: { foo: 'bar' },
        errors: [],
        extensions: { dataConnect: [{ entityIds: ['id1'] }] }
      }
    };

    const messageWithoutExtensions = {
      result: {
        requestId: '2',
        data: { abc: 'xyz' },
        errors: []
      }
    };

    it('should correctly parse incoming JSON and handle response', async () => {
      const handleResponseStub = sinon
        .stub(transport, 'handleResponse')
        .resolves();

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      await transport.connection!.simulateMessage(
        JSON.stringify(messageWithExtensions)
      );

      expect(handleResponseStub).to.have.been.calledOnce;
      const [calledRequestId, calledResponse] =
        handleResponseStub.firstCall.args;
      expect(calledRequestId).to.equal(messageWithExtensions.result.requestId);
      expect(calledResponse.data).to.deep.equal(
        messageWithExtensions.result.data
      );
      expect(calledResponse.errors).to.deep.equal(
        messageWithExtensions.result.errors
      );
      expect(calledResponse.extensions).to.deep.equal(
        messageWithExtensions.result.extensions
      );
    });

    it('should map extensions to empty array if not strictly provided', async () => {
      const handleResponseStub = sinon
        .stub(transport, 'handleResponse')
        .resolves();

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      await transport.connection!.simulateMessage(
        JSON.stringify(messageWithoutExtensions)
      );

      expect(handleResponseStub).to.have.been.calledOnce;
      const calledResponse = handleResponseStub.firstCall.args[1];
      expect(calledResponse.extensions).to.deep.equal({ dataConnect: [] });
    });

    it('should close connection with error if message is not an object', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      await mockWs.simulateMessage(
        JSON.stringify('this is a string, not an object')
      );

      expect(mockWs.close).to.have.been.calledOnceWith(
        WebSocketCloseCode.GRACEFUL_CLOSE,
        'WebSocket message is not an object'
      );
      expect(logErrorStub).to.have.been.calledOnce;
      expect(logErrorStub).to.have.been.calledWithMatch(
        'DataConnect WebSocket error, closing stream'
      );
    });

    it('should close connection with error if result is missing', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      const invalidData = { foo: 'bar' }; // no result object

      await mockWs.simulateMessage(JSON.stringify(invalidData));

      expect(mockWs.close).to.have.been.calledOnceWith(
        WebSocketCloseCode.GRACEFUL_CLOSE,
        'WebSocket message from emulator did not include result'
      );
      expect(logErrorStub).to.have.been.calledOnce;
      expect(logErrorStub).to.have.been.calledWithMatch(
        'DataConnect WebSocket error, closing stream'
      );
    });

    it('should close connection with error if result is not an object', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      const invalidData = { result: 'string result' };

      await mockWs.simulateMessage(JSON.stringify(invalidData));

      expect(mockWs.close).to.have.been.calledOnceWith(
        WebSocketCloseCode.GRACEFUL_CLOSE,
        'WebSocket message result is not an object'
      );
      expect(logErrorStub).to.have.been.calledOnce;
      expect(logErrorStub).to.have.been.calledWithMatch(
        'DataConnect WebSocket error, closing stream'
      );
    });

    it('should close connection with error if requestId is missing', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      const invalidData = { result: { foo: 'bar' } }; // no requestId

      await mockWs.simulateMessage(JSON.stringify(invalidData));

      expect(mockWs.close).to.have.been.calledOnceWith(
        WebSocketCloseCode.GRACEFUL_CLOSE,
        'WebSocket message did not include requestId'
      );
      expect(logErrorStub).to.have.been.calledOnce;
      expect(logErrorStub).to.have.been.calledWithMatch(
        'DataConnect WebSocket error, closing stream'
      );
    });
  });
});

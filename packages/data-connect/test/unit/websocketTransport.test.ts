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
import { DataConnectError } from '../../src/core/error';
import { WebSocketTransport, initializeWebSocket } from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';
import { DataConnectResponse } from '../../src/network/transport';

import { expectIsNotSettled } from './testUtils';

chai.use(sinonChai);
chai.use(chaiAsPromised);

/** Interface that exposes some private fields and methods of WebSocketTransport for testing purposes. */
interface TransportWithInternals {
  openConnection(): Promise<void>;
  closeConnection(): Promise<void>;
  sendMessage(req: DataConnectStreamRequest<unknown>): Promise<void>;
  connection: MockWebSocket | undefined;
  isReady: boolean;
  handleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void>;
}

class MockWebSocket {
  static readonly CONNECTING = WebSocket.CONNECTING;
  static readonly OPEN = WebSocket.OPEN;
  static readonly CLOSING = WebSocket.CLOSING;
  static readonly CLOSED = WebSocket.CLOSED;

  readyState: number = MockWebSocket.CONNECTING;
  send: sinon.SinonSpy = sinon.spy();
  close: sinon.SinonSpy = sinon.spy();

  onopen: (() => void | Promise<void>) | null = null;
  onerror: ((err: Error) => void | Promise<void>) | null = null;
  onmessage: ((ev: MessageEvent) => void | Promise<void>) | null = null;
  onclose: ((ev: CloseEvent) => void | Promise<void>) | null = null;

  url: string;
  constructor(url: string) {
    this.url = url;
  }

  simulateOpen(): void | Promise<void> {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      return this.onopen();
    }
  }

  simulateError(err: Error): void | Promise<void> {
    if (this.onerror) {
      return this.onerror(err);
    }
  }

  simulateMessage(data: string): void | Promise<void> {
    if (this.onmessage) {
      return this.onmessage({ data } as MessageEvent);
    }
  }

  simulateClose(code = 1000, reason = 'Normal Closure'): void | Promise<void> {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      return this.onclose({ code, reason } as CloseEvent);
    }
  }
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
    transport = new WebSocketTransport(dcOptions) as unknown as TransportWithInternals;
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

  describe('isReady', () => {
    it('should be false initially', () => {
      expect(transport.isReady).to.be.false;
    });

    it('should be false while connecting', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      expect(transport.isReady).to.be.false;
    });

    it('should be true when connected', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      expect(transport.isReady).to.be.true;
    });

    it('should be false after disconnected', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      await transport.connection!.simulateClose();
      expect(transport.isReady).to.be.false;
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
      await expect(transport.closeConnection()).to.be.rejectedWith(connectionError);
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
      expect(transport.connection!.send).to.have.been.calledOnceWith(JSON.stringify(payload));
    });
  });

  describe('handleWebSocketMessage', () => {
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
      const handleResponseStub = sinon.stub(transport, 'handleResponse').resolves();

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      await transport.connection!.simulateMessage(JSON.stringify(messageWithExtensions));

      expect(handleResponseStub).to.have.been.calledOnce;
      const [calledRequestId, calledResponse] = handleResponseStub.firstCall.args;
      expect(calledRequestId).to.equal(messageWithExtensions.result.requestId);
      expect(calledResponse.data).to.deep.equal(messageWithExtensions.result.data);
      expect(calledResponse.errors).to.deep.equal(messageWithExtensions.result.errors);
      expect(calledResponse.extensions).to.deep.equal(messageWithExtensions.result.extensions);
    });

    it('should map extensions to empty array if not strictly provided', async () => {
      const handleResponseStub = sinon.stub(transport, 'handleResponse').resolves();

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      await transport.connection!.simulateMessage(JSON.stringify(messageWithoutExtensions));

      expect(handleResponseStub).to.have.been.calledOnce;
      const calledResponse = handleResponseStub.firstCall.args[1];
      expect(calledResponse.extensions).to.deep.equal({ dataConnect: [] });
    });

    it('should throw if result is missing', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      const invalidData = { foo: 'bar' }; // no result object

      let error: DataConnectError | undefined;
      try {
        await transport.connection!.simulateMessage(JSON.stringify(invalidData));
      } catch (err: unknown) {
        error = err as DataConnectError;
      }

      expect(error).to.not.be.undefined;
      expect(error!.message).to.include('message from stream did not include result');
    });

    it('should throw if requestId is missing', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      const invalidData = { result: { foo: 'bar' } }; // no requestId

      let error: DataConnectError | undefined;
      try {
        await transport.connection!.simulateMessage(JSON.stringify(invalidData));
      } catch (err: unknown) {
        error = err as DataConnectError;
      }

      expect(error).to.not.be.undefined;
      expect(error!.message).to.include('server response did not include requestId');
    });
  });
});

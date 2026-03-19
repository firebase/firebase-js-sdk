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
import { WebSocketTransport, initializeWebSocket } from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

import { expectIsNotSettled } from './testUtils';

chai.use(sinonChai);
chai.use(chaiAsPromised);

/** Interface that exposes some private fields and methods of WebSocketTransport for testing purposes. */
interface TransportWithInternals {
  openConnection(): Promise<void>;
  closeConnection(): Promise<void>;
  sendMessage(req: DataConnectStreamRequest<unknown>): Promise<void>;
  connection: MockWebSocket | undefined;
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
      const onOpenStub = sinon.stub(transport.connection!, 'onopen');
      const openPromise1 = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise1;
      const previousConnection = transport.connection;
      const openPromise2 = transport.openConnection();
      await openPromise2;
      expect(transport.connection).to.equal(previousConnection);
      expect(onOpenStub).to.have.been.calledOnce;
    });

    it('should de-duplicate calls when open connection is pending', async () => {
      const onOpenStub = sinon.stub(transport.connection!, 'onopen');
      const openPromise1 = transport.openConnection();
      await expectIsNotSettled(openPromise1);
      const openPromise2 = transport.openConnection();
      await expectIsNotSettled(openPromise2);
      await transport.connection!.simulateOpen();
      await expect(openPromise1).to.be.fulfilled;
      await expect(openPromise2).to.be.fulfilled;
      expect(onOpenStub).to.have.been.calledOnce;
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

  describe('_handleWebSocketMessage', () => {
    it('should correctly parse incoming JSON and handle response', async () => {
      // Use stub instead of spy to avoid testing base class logic regarding unknown requestIds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleResponseStub = sinon.stub(transport as any, 'handleResponse').resolves();

      // First open connection
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
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

      await transport.connection!.simulateMessage(JSON.stringify(incomingData));

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

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      // Incoming message WITHOUT extensions field
      const incomingData = {
        result: {
          requestId: '2',
          data: { foo: 'bar' },
          errors: []
        }
      };

      await transport.connection!.simulateMessage(JSON.stringify(incomingData));

      expect(handleResponseStub).to.have.been.calledOnce;
      const calledResponse = handleResponseStub.firstCall.args[1];

      expect(calledResponse.extensions).to.deep.equal({ dataConnect: [] });
    });

    it('should throw if result or requestId is missing', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      const invalidData1 = { foo: 'bar' }; // no result object
      const invalidData2 = { result: { foo: 'bar' } }; // no requestId

      let error1: unknown;
      try {
        await transport.connection!.simulateMessage(JSON.stringify(invalidData1));
      } catch (err: unknown) {
        error1 = err;
      }
      expect(error1).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error1 as any).message).to.include('message from stream did not include result');

      let error2: unknown;
      try {
        await transport.connection!.simulateMessage(JSON.stringify(invalidData2));
      } catch (err: unknown) {
        error2 = err;
      }
      expect(error2).to.exist;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error2 as any).message).to.include('server response did not include requestId');
    });
  });
});

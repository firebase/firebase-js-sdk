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

import type { MockInstance } from 'vitest';

import { DataConnectOptions } from '../../src/api/DataConnect';
import { Code } from '../../src/core/error';
import * as logger from '../../src/logger';
import {
  WEBSOCKET_CLOSE_CODE,
  WebSocketTransport,
  initializeWebSocket
} from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';
import { DataConnectResponse } from '../../src/network/transport';

import { expectIsNotSettled, MockWebSocket } from './testUtils';

// `vi.spyOn` cannot replace an ESM named export in browser mode, so mock the
// logger module (keeping its real implementation) to make `logError` spyable.
vi.mock('../../src/logger', { spy: true });

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
  rejectAllRequests(code: Code, reason: string): void;
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
    vi.restoreAllMocks();
  });

  const connectionError = new Error('Test connection error');

  describe('openConnection', () => {
    it('should resolve when onopen fires', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      await transport.connection!.simulateOpen();
      await expect(openPromise).resolves.toBeUndefined();
    });

    it('should reject when onerror fires', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      await transport.connection!.simulateError(connectionError);
      await expect(openPromise).rejects.toThrow(/Failed to open connection/);
    });

    it('should de-duplicate calls when already connected', async () => {
      const openPromise1 = transport.openConnection();
      const onOpenSpy = vi.spyOn(transport.connection!, 'onopen');
      await transport.connection!.simulateOpen();
      await openPromise1;
      const previousConnection = transport.connection;
      const openPromise2 = transport.openConnection();
      await openPromise2;
      expect(transport.connection).toBe(previousConnection);
      expect(onOpenSpy).toHaveBeenCalledOnce();
    });

    it('should de-duplicate calls when open connection is pending', async () => {
      const openPromise1 = transport.openConnection();
      const onOpenSpy = vi.spyOn(transport.connection!, 'onopen');
      await expectIsNotSettled(openPromise1);
      const openPromise2 = transport.openConnection();
      await expectIsNotSettled(openPromise2);
      await transport.connection!.simulateOpen();
      await expect(openPromise1).resolves.toBeUndefined();
      await expect(openPromise2).resolves.toBeUndefined();
      expect(onOpenSpy).toHaveBeenCalledOnce();
    });
  });

  describe('streamIsReady', () => {
    it('should be false initially', () => {
      expect(transport.streamIsReady).toBe(false);
    });

    it('should be false while connecting', async () => {
      const openPromise = transport.openConnection();
      await expectIsNotSettled(openPromise);
      expect(transport.streamIsReady).toBe(false);
    });

    it('should be true when connected', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      expect(transport.streamIsReady).toBe(true);
    });

    it('should be false after disconnected', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      await transport.connection!.simulateClose();
      expect(transport.streamIsReady).toBe(false);
    });
  });

  describe('closeConnection', () => {
    it('should close the underlying websocket and reset connection states', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      const mockWs = transport.connection!;
      await transport.closeConnection();
      expect(mockWs.close).toHaveBeenCalledOnce();
      expect(transport.connection).toBeUndefined();
    });

    it('should be idempotent if connection is already closed', async () => {
      await expect(transport.closeConnection()).resolves.toBeUndefined();
    });

    it('should return rejected promise and clean up if ws.close() throws', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      const mockWs = transport.connection!;
      mockWs.close = vi.fn().mockImplementation(() => {
        throw connectionError;
      });
      await expect(transport.closeConnection()).rejects.toThrow(
        connectionError
      );
      expect(transport.connection).toBeUndefined();
    });
  });

  describe('onclose handler (handleWebsocketDisconnect)', () => {
    it('should reset connection state when websocket is closed externally', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;
      expect(transport.connection).not.toBeUndefined();
      // simulate server drop / unexpected closure
      await transport.connection!.simulateClose();
      expect(transport.connection).toBeUndefined();
    });

    it('should call rejectAllRequests and clean up when closed externally', async () => {
      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      const rejectSpy = vi.spyOn(transport, 'rejectAllRequests');

      await transport.connection!.simulateClose();

      expect(rejectSpy).toHaveBeenCalledOnce();
      expect(rejectSpy.mock.calls[0][0]).toBe(Code.OTHER);
      expect(rejectSpy.mock.calls[0][1]).toBe(
        `Stream disconnected while idle with code ${WEBSOCKET_CLOSE_CODE}: Normal Closure`
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
      expect(transport.connection!.send).toHaveBeenCalledOnce();
    });

    it('should send stringified json payload', async () => {
      const sendPromise = transport.sendMessage(payload);
      await transport.connection!.simulateOpen();
      await sendPromise;
      expect(transport.connection!.send).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify(payload)
      );
    });
  });

  describe('handleWebSocketMessage', () => {
    let logErrorStub: MockInstance;
    beforeEach(() => {
      logErrorStub = vi.mocked(logger.logError);
      logErrorStub.mockReset();
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
      const handleResponseStub = vi
        .spyOn(transport, 'handleResponse')
        .mockResolvedValue(undefined);

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      await transport.connection!.simulateMessage(
        JSON.stringify(messageWithExtensions)
      );

      expect(handleResponseStub).toHaveBeenCalledOnce();
      const [calledRequestId, calledResponse] =
        handleResponseStub.mock.calls[0];
      expect(calledRequestId).toBe(messageWithExtensions.result.requestId);
      expect(calledResponse.data).toEqual(messageWithExtensions.result.data);
      expect(calledResponse.errors).toEqual(
        messageWithExtensions.result.errors
      );
      expect(calledResponse.extensions).toEqual(
        messageWithExtensions.result.extensions
      );
    });

    it('should map extensions to empty array if not strictly provided', async () => {
      const handleResponseStub = vi
        .spyOn(transport, 'handleResponse')
        .mockResolvedValue(undefined);

      const openPromise = transport.openConnection();
      await transport.connection!.simulateOpen();
      await openPromise;

      await transport.connection!.simulateMessage(
        JSON.stringify(messageWithoutExtensions)
      );

      expect(handleResponseStub).toHaveBeenCalledOnce();
      const calledResponse = handleResponseStub.mock.calls[0][1];
      expect(calledResponse.extensions).toEqual({ dataConnect: [] });
    });

    it('should close connection with error if message is not an object', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      await mockWs.simulateMessage(
        JSON.stringify('this is a string, not an object')
      );

      expect(mockWs.close).toHaveBeenCalledExactlyOnceWith(
        WEBSOCKET_CLOSE_CODE,
        'WebSocket message is not an object'
      );
      expect(logErrorStub).toHaveBeenCalledOnce();
      expect(logErrorStub).toHaveBeenCalledWith(
        expect.stringContaining('DataConnect WebSocket error, closing stream')
      );
    });

    it('should close connection with error if result is missing', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      const invalidData = { foo: 'bar' }; // no result object

      await mockWs.simulateMessage(JSON.stringify(invalidData));

      expect(mockWs.close).toHaveBeenCalledExactlyOnceWith(
        WEBSOCKET_CLOSE_CODE,
        'WebSocket message from emulator did not include result'
      );
      expect(logErrorStub).toHaveBeenCalledOnce();
      expect(logErrorStub).toHaveBeenCalledWith(
        expect.stringContaining('DataConnect WebSocket error, closing stream')
      );
    });

    it('should close connection with error if result is not an object', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      const invalidData = { result: 'string result' };

      await mockWs.simulateMessage(JSON.stringify(invalidData));

      expect(mockWs.close).toHaveBeenCalledExactlyOnceWith(
        WEBSOCKET_CLOSE_CODE,
        'WebSocket message result is not an object'
      );
      expect(logErrorStub).toHaveBeenCalledOnce();
      expect(logErrorStub).toHaveBeenCalledWith(
        expect.stringContaining('DataConnect WebSocket error, closing stream')
      );
    });

    it('should close connection with error if requestId is missing', async () => {
      const openPromise = transport.openConnection();
      const mockWs = transport.connection!;
      await mockWs.simulateOpen();
      await openPromise;

      const invalidData = { result: { foo: 'bar' } }; // no requestId

      await mockWs.simulateMessage(JSON.stringify(invalidData));

      expect(mockWs.close).toHaveBeenCalledExactlyOnceWith(
        WEBSOCKET_CLOSE_CODE,
        'WebSocket message did not include requestId'
      );
      expect(logErrorStub).toHaveBeenCalledOnce();
      expect(logErrorStub).toHaveBeenCalledWith(
        expect.stringContaining('DataConnect WebSocket error, closing stream')
      );
    });
  });
});

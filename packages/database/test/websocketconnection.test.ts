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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APPLICATION_ID_PARAM } from '../src/realtime/Constants';
import {
  getWebSocketImpl,
  setWebSocketImpl,
  WebSocketConnection
} from '../src/realtime/WebSocketConnection';

import { testRepoInfo } from './helpers/util';

interface MockSocket {
  statusCode?: number;
  onopen?: () => void;
  onclose?: (e?: unknown) => void;
  onmessage?: (m: unknown) => void;
  onerror?: (e?: unknown) => void;
  close: () => void;
  send: (data: string) => void;
}

describe('WebSocketConnection', () => {
  let activeMockSocket: MockSocket | null = null;
  let originalWebSocketImpl: unknown;

  beforeEach(() => {
    originalWebSocketImpl = getWebSocketImpl();
  });

  afterEach(() => {
    activeMockSocket = null;
    setWebSocketImpl(originalWebSocketImpl);
    vi.restoreAllMocks();
  });

  it('should add an applicationId to the query parameter', () => {
    const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');
    const applicationId = 'myID';
    const websocketConnection = new WebSocketConnection(
      'connId',
      repoInfo,
      applicationId
    );
    const searchParams = new URL(websocketConnection.connURL).searchParams;
    expect(searchParams.get(APPLICATION_ID_PARAM)).toBe(applicationId);
  });
  it('should not add an applicationId to the query parameter if applicationId is empty', () => {
    const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');
    const applicationId = '';
    const websocketConnection = new WebSocketConnection(
      'connId',
      repoInfo,
      applicationId
    );
    const searchParams = new URL(websocketConnection.connURL).searchParams;
    expect(searchParams.get(APPLICATION_ID_PARAM)).toBeNull();
  });

  for (const statusCode of [402, 429]) {
    it(`captures HTTP ${statusCode} from mySock.statusCode on error before shutdown nulls mySock`, () => {
      class FakeWebSocket implements MockSocket {
        statusCode?: number;
        onopen?: () => void;
        onclose?: (e?: unknown) => void;
        onmessage?: (m: unknown) => void;
        onerror?: (e?: unknown) => void;
        close = vi.fn();
        send = vi.fn();

        constructor() {
          activeMockSocket = this;
        }
      }
      setWebSocketImpl(FakeWebSocket);

      const conn = new WebSocketConnection(
        'connId',
        testRepoInfo('https://test-ns.firebaseio.com')
      );
      const onDisconnect = vi.fn();
      conn.open(() => {}, onDisconnect);

      expect(activeMockSocket).not.toBeNull();
      activeMockSocket!.statusCode = statusCode;
      activeMockSocket!.onerror?.({ message: `HTTP ${statusCode}` });

      expect(conn.mySock).toBeNull();
      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledWith(false, statusCode);
    });

    it(`captures HTTP ${statusCode} from event.statusCode on close before shutdown`, () => {
      class FakeWebSocket implements MockSocket {
        statusCode?: number;
        onopen?: () => void;
        onclose?: (e?: unknown) => void;
        onmessage?: (m: unknown) => void;
        onerror?: (e?: unknown) => void;
        close = vi.fn();
        send = vi.fn();

        constructor() {
          activeMockSocket = this;
        }
      }
      setWebSocketImpl(FakeWebSocket);

      const conn = new WebSocketConnection(
        'connId',
        testRepoInfo('https://test-ns.firebaseio.com')
      );
      const onDisconnect = vi.fn();
      conn.open(() => {}, onDisconnect);

      expect(activeMockSocket).not.toBeNull();
      activeMockSocket!.onclose?.({ statusCode });

      expect(conn.mySock).toBeNull();
      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledWith(false, statusCode);
    });
  }

  it('passes undefined httpStatus when socket closes without statusCode', () => {
    class FakeWebSocket implements MockSocket {
      onopen?: () => void;
      onclose?: (e?: unknown) => void;
      onmessage?: (m: unknown) => void;
      onerror?: (e?: unknown) => void;
      close = vi.fn();
      send = vi.fn();

      constructor() {
        activeMockSocket = this;
      }
    }
    setWebSocketImpl(FakeWebSocket);

    const conn = new WebSocketConnection(
      'connId',
      testRepoInfo('https://test-ns.firebaseio.com')
    );
    const onDisconnect = vi.fn();
    conn.open(() => {}, onDisconnect);

    activeMockSocket!.onopen?.();
    activeMockSocket!.onclose?.({});

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(true, undefined);
  });
});

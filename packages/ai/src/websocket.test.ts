/**
 * @license
 * Copyright 2025 Google LLC
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

import { expect, vi } from 'vitest';
import { WebSocketHandlerImpl } from './websocket';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  sentMessages: Array<string | ArrayBuffer> = [];
  url: string;
  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  send(data: string | ArrayBuffer): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not in OPEN state');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    if (
      this.readyState === MockWebSocket.CLOSED ||
      this.readyState === MockWebSocket.CLOSING
    ) {
      return;
    }
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.dispatchEvent(new Event('close'));
    }, 10);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): void {
    this.listeners.get(event.type)?.forEach(listener => listener(event));
  }

  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  triggerMessage(data: any): void {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }

  triggerError(): void {
    this.dispatchEvent(new Event('error'));
  }
}

describe('WebSocketHandlerImpl', () => {
  let handler: WebSocketHandlerImpl;
  let mockWebSocket: MockWebSocket;
  let webSocketStub: any;

  beforeEach(() => {
    if (typeof (globalThis as any).WebSocket === 'undefined') {
      (globalThis as any).WebSocket = class {
        static readonly CONNECTING = 0;
        static readonly OPEN = 1;
        static readonly CLOSING = 2;
        static readonly CLOSED = 3;
      };
    }
    webSocketStub = vi
      .spyOn(globalThis, 'WebSocket')
      .mockImplementation(function (url: any) {
        mockWebSocket = new MockWebSocket(url);
        return mockWebSocket as any;
      } as any);
    vi.useFakeTimers({ now: 0 });
    handler = new WebSocketHandlerImpl();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('connect()', () => {
    it('should resolve on open event', async () => {
      const connectPromise = handler.connect('ws://test-url');
      expect(webSocketStub).toHaveBeenCalledWith('ws://test-url');

      await vi.advanceTimersByTimeAsync(1);
      mockWebSocket.triggerOpen();

      await expect(connectPromise).resolves.toBeUndefined();
    });

    it('should reject on error event', async () => {
      const connectPromise = handler.connect('ws://test-url');
      await vi.advanceTimersByTimeAsync(1);
      mockWebSocket.triggerError();

      await expect(connectPromise).rejects.toThrow(
        /Error event raised on WebSocket/
      );
    });
  });

  describe('listen()', () => {
    beforeEach(async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;
    });

    it('should yield multiple messages as they arrive', async () => {
      const generator = handler.listen();

      const received: unknown[] = [];
      const listenPromise = (async () => {
        for await (const msg of generator) {
          received.push(msg);
        }
      })();

      // Use tickAsync to allow the consumer to start listening
      await vi.advanceTimersByTimeAsync(1);
      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 1 })]));

      await vi.advanceTimersByTimeAsync(10);
      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 2 })]));

      while (received.length < 2) {
        await vi.advanceTimersByTimeAsync(10);
      }
      mockWebSocket.close();
      await vi.runAllTimersAsync(); // Let timers finish

      await listenPromise; // Wait for the consumer to finish

      expect(received).to.deep.equal([
        {
          foo: 1
        },
        {
          foo: 2
        }
      ]);
    });

    it('should buffer messages that arrive before the consumer calls .next()', async () => {
      const generator = handler.listen();

      // Create a promise that will consume the generator in a separate async context
      const received: unknown[] = [];
      const consumptionPromise = (async () => {
        for await (const message of generator) {
          received.push(message);
        }
      })();

      await vi.advanceTimersByTimeAsync(1);

      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 1 })]));
      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 2 })]));

      while (received.length < 2) {
        await vi.advanceTimersByTimeAsync(10);
      }
      mockWebSocket.close();
      await vi.runAllTimersAsync();

      await consumptionPromise;

      expect(received).to.deep.equal([
        {
          foo: 1
        },
        {
          foo: 2
        }
      ]);
    });
  });

  describe('close()', () => {
    it('should be idempotent and not throw if called multiple times', async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;

      const closePromise1 = handler.close();
      await vi.runAllTimersAsync();
      await closePromise1;

      await expect(handler.close()).resolves.toBeUndefined();
    });

    it('should wait for the onclose event before resolving', async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;

      let closed = false;
      const closePromise = handler.close().then(() => {
        closed = true;
      });

      // The promise should not have resolved yet
      await vi.advanceTimersByTimeAsync(5);
      expect(closed).to.be.false;

      // Now, let the mock's setTimeout for closing run, which triggers onclose
      await vi.advanceTimersByTimeAsync(10);

      await expect(closePromise).resolves.toBeUndefined();
      expect(closed).to.be.true;
    });
  });

  describe('Interaction between listen() and close()', () => {
    it('should allow close() to take precedence and resolve correctly, while also terminating the listener', async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;

      const generator = handler.listen();
      const listenPromise = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of generator) {
        }
      })();

      const closePromise = handler.close();

      await vi.runAllTimersAsync();

      await expect(closePromise).resolves.toBeUndefined();
      await expect(listenPromise).resolves.toBeUndefined();

      expect(mockWebSocket.readyState).to.equal(MockWebSocket.CLOSED);
    });
  });
});

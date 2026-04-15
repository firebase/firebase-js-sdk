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

chai.use(chaiAsPromised);

/**
 * Asserts that a promise does not settle within the given timeout.
 * @param promise The promise to test.
 * @param timeout The timeout in milliseconds (defaults to 1000ms). Note that the test runner's timeout defaults to 5000ms.
 * @internal
 */
export async function expectIsNotSettled(
  promise: Promise<unknown>,
  timeout: number = 1000
): Promise<void> {
  const unsettled = { settled: false };
  const result = await Promise.race<{
    settled: boolean;
    resolvedWith?: unknown;
    rejectedWith?: unknown;
  }>([
    promise
      .then(resolvedWith => ({ settled: true, resolvedWith }))
      .catch(rejectedWith => ({ settled: true, rejectedWith })),
    new Promise(resolve => {
      setTimeout(() => resolve(unsettled), timeout);
    })
  ]);
  expect(result).to.equal(
    unsettled,
    `expected promise to not settle within ${timeout}ms!`
  );
}

/**
 * Sleeps for the given number of milliseconds.
 * @param ms The number of milliseconds to sleep.
 * @internal
 */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Mock WebSocket class for testing purposes.
 * @internal
 */
export class MockWebSocket {
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

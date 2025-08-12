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

import { NodeWebSocketHandler } from './node/websocket';

/**
 * A standardized interface for interacting with a WebSocket connection.
 * This abstraction allows the SDK to use the appropriate WebSocket implementation
 * for the current JS environment (Browser vs. Node) without
 * changing the core logic of the `LiveSession`.
 * @internal
 */
export interface WebSocketHandler {
  /**
   * Establishes a connection to the given URL.
   *
   * @param url The WebSocket URL (e.g., wss://...).
   * @returns A promise that resolves on successful connection or rejects on failure.
   */
  connect(url: string): Promise<void>;

  /**
   * Sends data over the WebSocket.
   *
   * @param data The string or binary data to send.
   */
  send(data: string | ArrayBuffer): void;

  /**
   * Returns an async generator that yields parsed JSON objects from the server.
   * The yielded type is `unknown` because the handler cannot guarantee the shape of the data.
   * The consumer is responsible for type validation.
   * The generator terminates when the connection is closed.
   *
   * @returns A generator that allows consumers to pull messages using a `for await...of` loop.
   */
  listen(): AsyncGenerator<unknown>;

  /**
   * Closes the WebSocket connection.
   *
   * @param code - A numeric status code explaining why the connection is closing.
   * @param reason - A human-readable string explaining why the connection is closing.
   */
  close(code?: number, reason?: string): Promise<void>;
}

/**
 * NOTE: Imports to this these APIs are renamed to either `platform/browser/websocket.ts` or
 * `platform/node/websocket.ts` during build time.
 *
 * The types are still useful for type-checking during development.
 * These are only used during the Node tests, which are ran against non-bundled code.
 */

/**
 * Factory function to create the appropriate WebSocketHandler for the current environment.
 *
 * This is only a stub for tests. See the real definitions in `./browser/websocket.ts` and
 * `./node/websocket.ts`.
 *
 * @internal
 */
export function createWebSocketHandler(): WebSocketHandler {
  if (typeof WebSocket === 'undefined') {
    throw Error(
      'WebSocket API is not available. Make sure tests are being ran in Node >= 22.'
    );
  }

  return new NodeWebSocketHandler();
}

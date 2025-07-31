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

import { isBrowser, isNode } from '@firebase/util';
import { AIError } from '../errors';
import { AIErrorCode } from '../public-types';
import { NodeWebSocketHandler } from './node-websocket-handler';
import { BrowserWebSocketHandler } from './browser-websocket-handler';

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
 * Factory function to create the appropriate WebSocketHandler for the current environment.
 *
 * Even though the browser and Node >=22 WebSocket APIs are now very similar,
 * we use two separate handler classes. There are two reasons for this:
 *
 * 1. Module Loading: The primary difference is how the `WebSocket` class is
 *    accessed. In browsers, it's a global (`window.WebSocket`). In Node, it
 *    must be imported from the built-in `'ws'` module. Isolating the Node
 *    `import('ws')` call in its own class prevents browser-bundling tools
 *    (like Webpack, Vite) from trying to resolve a Node-specific module, which
 *    would either fail the build or include unnecessary polyfills.
 *
 * 2. Type Safety: TypeScript's type definitions for the browser's WebSocket
 *    (from `lib.dom.d.ts`) and Node's WebSocket (from `@types/node`) are
 *    distinct. Using separate classes ensures type correctness for each environment.
 *
 * @internal
 */
export function createWebSocketHandler(): WebSocketHandler {
  // `isNode()` is replaced with a static boolean during build time to enable tree shaking
  if (isNode()) {
    const [major] = process.versions.node.split('.').map(Number);
    if (major < 22) {
      throw new AIError(
        AIErrorCode.UNSUPPORTED,
        'The Live feature requires Node version 22 or higher for native WebSocket support.'
      );
    }
    return new NodeWebSocketHandler();
  }

  // `isBrowser()` is replaced with a static boolean during build time to enable tree shaking
  if (isBrowser() && window.WebSocket) {
    return new BrowserWebSocketHandler();
  }

  throw new AIError(
    AIErrorCode.UNSUPPORTED,
    'A WebSocket API is not available in this environment.'
  );
}

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

import { AIError } from '../../errors';
import { AIErrorCode } from '../../types';
import { WebSocketHandler } from '../websocket';

export function createWebSocketHandler(): WebSocketHandler {
  if (typeof process === 'object' && process.versions?.node) {
    const [major] = process.versions.node.split('.').map(Number);
    if (major < 22) {
      throw new AIError(
        AIErrorCode.UNSUPPORTED,
        `The "Live" feature is being used in a Node environment, but the ` +
          `runtime version is ${process.versions.node}. This feature requires Node >= 22 ` +
          `for native WebSocket support.`
      );
    } else if (typeof WebSocket === 'undefined') {
      throw new AIError(
        AIErrorCode.UNSUPPORTED,
        `The "Live" feature is being used in a Node environment that does not offer the ` +
          `'WebSocket' API in the global scope.`
      );
    }

    return new NodeWebSocketHandler();
  } else {
    throw new AIError(
      AIErrorCode.UNSUPPORTED,
      'The "Live" feature is not supported in this Node-like environment. It is supported in ' +
        'modern browser windows, Web Workers with WebSocket support, and Node >= 22.'
    );
  }
}

/**
 * A WebSocketHandler implementation for Node >= 22.
 *
 * Node 22 is the minimum version that offers the built-in global `WebSocket` API.
 *
 * @internal
 */
export class NodeWebSocketHandler implements WebSocketHandler {
  private ws?: WebSocket;

  async connect(url: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'blob';
      this.ws!.addEventListener('open', () => resolve(), { once: true });
      this.ws!.addEventListener(
        'error',
        () =>
          reject(
            new AIError(
              AIErrorCode.FETCH_ERROR,
              'Failed to establish WebSocket connection'
            )
          ),
        { once: true }
      );
    });
  }

  send(data: string | ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new AIError(AIErrorCode.REQUEST_ERROR, 'WebSocket is not open.');
    }
    this.ws.send(data);
  }

  async *listen(): AsyncGenerator<unknown> {
    if (!this.ws) {
      throw new AIError(
        AIErrorCode.REQUEST_ERROR,
        'WebSocket is not connected.'
      );
    }

    const messageQueue: unknown[] = [];
    let resolvePromise: (() => void) | null = null;
    let isClosed = false;

    const messageListener = async (event: MessageEvent): Promise<void> => {
      if (event.data instanceof Blob) {
        try {
          const obj = JSON.parse(await event.data.text()) as unknown;
          messageQueue.push(obj);
          if (resolvePromise) {
            resolvePromise();
            resolvePromise = null;
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message to JSON:', e);
        }
      } else {
        throw new AIError(
          AIErrorCode.PARSE_FAILED,
          `Failed to parse WebSocket response to JSON. ` +
            `Expected data to be a Blob, but was ${typeof event.data}.`
        );
      }
    };

    const closeListener = (): void => {
      isClosed = true;
      if (resolvePromise) {
        resolvePromise();
        resolvePromise = null;
      }
      // Clean up listeners to prevent memory leaks
      this.ws?.removeEventListener('message', messageListener);
      this.ws?.removeEventListener('close', closeListener);
    };

    this.ws.addEventListener('message', messageListener);
    this.ws.addEventListener('close', closeListener);

    while (!isClosed) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        await new Promise<void>(resolve => {
          resolvePromise = resolve;
        });
      }
    }
  }

  close(code?: number, reason?: string): Promise<void> {
    return new Promise(resolve => {
      if (!this.ws) {
        return resolve();
      }

      this.ws.addEventListener('close', () => resolve(), { once: true });
      // Calling 'close' during these states results in an error.
      if (
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        return resolve();
      }

      if (this.ws.readyState !== WebSocket.CLOSING) {
        this.ws.close(code, reason);
      }
    });
  }
}

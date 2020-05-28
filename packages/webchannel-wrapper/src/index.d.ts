/**
 * @license
 * Copyright 2019 Google LLC
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

// WARNING: This is not a complete set of types exported by WebChannelWrapper.
// It is merely meant to support the usage patterns of the Firestore SDK.

export var EventType: {
  COMPLETE: string;
};

export namespace WebChannel {
  export var EventType: {
    OPEN: string;
    CLOSE: string;
    ERROR: string;
    MESSAGE: string;
  };
}

export var ErrorCode: {
  NO_ERROR: number;
  HTTP_ERROR: number;
  TIMEOUT: number;
};

export interface Headers {
  [name: string]: string | number;
}

export interface WebChannelError {
  error?: { status: string; message: string };
}

export class XhrIo {
  send(
    url: string,
    method?: string,
    body?: string,
    headers?: Headers,
    timeoutInterval?: number
  ): void;

  getLastErrorCode(): number;

  getLastError(): string;

  getStatus(): number;

  getResponseText(): string;

  getResponseJson(): WebChannelError | object;

  listenOnce(type: string, cb: (param: unknown) => void): void;
}

export interface WebChannelOptions {
  messageHeaders?: {
    // To ensure compatibility with property minifcation tools, keys need to
    // be listed explicity.
    [k: string]: never;
  };
  initMessageHeaders?: {
    // To ensure compatibility with property minifcation tools, keys need to
    // be listed explicity.
    [k: string]: never;
  };
  messageContentType?: string;
  messageUrlParams?: {
    database?: string;
  };
  clientProtocolHeaderRequired?: boolean;
  concurrentRequestLimit?: number;
  supportsCrossDomainXhr?: boolean;
  sendRawJson?: boolean;
  httpSessionIdParam?: string;
  httpHeadersOverwriteParam?: string;
  forceLongPolling?: boolean;
  fastHandshake?: boolean;
  disableRedac?: boolean;
  clientProfile?: string;
  internalChannelParams?: {
    forwardChannelRequestTimeoutMs?: number;
  };
  xmlHttpFactory?: unknown;
  requestRefreshThresholds?: { [key: string]: number };
}

export interface WebChannel {
  open(): void;
  close(): void;
  listen(type: string, cb: (param: unknown) => void): void;
  send(msg: unknown): void;
}

export interface WebChannelTransport {
  createWebChannel(url: string, options: WebChannelOptions): WebChannel;
}

export function createWebChannelTransport(): WebChannelTransport;

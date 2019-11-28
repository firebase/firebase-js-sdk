/**
 * @license
 * Copyright 2019 Google Inc.
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

export enum EventType {
  OPEN = 'open',
  CLOSE = 'close',
  ERROR = 'error',
  MESSAGE = 'message',
  COMPLETE = 'complete'
}

export namespace WebChannel {
  export enum EventType {
    OPEN = 'open',
    CLOSE = 'close',
    ERROR = 'error',
    MESSAGE = 'message',
    COMPLETE = 'complete'
  }
}

export enum ErrorCode {
  NO_ERROR = 0,
  ACCESS_DENIED,
  FILE_NOT_FOUND,
  FF_SILENT_ERROR,
  CUSTOM_ERROR,
  EXCEPTION,
  HTTP_ERROR,
  ABORT,
  TIMEOUT,
  OFFLINE
}

export interface Headers {
  [name: string]: string | number;
}

export class XhrIo {
  send(
    url: string,
    method?: string,
    body?: ArrayBufferView | Blob | string | null,
    headers?: Headers,
    timeoutInterval?: number
  ): Promise<XhrIo>;

  getLastErrorCode(): ErrorCode;

  getLastError(): string;

  getStatus(): number;

  getResponseText(): string;

  getResponseJson(): Object | any;

  abort(): void;

  getResponseHeader(header: string): { [key: string]: string };

  listenOnce<T>(type: EventType, cb: (param: T) => void): void;
}

type StringMap = { [key: string]: string };

export interface WebChannelOptions {
  messageHeaders?: StringMap;
  initMessageHeaders?: StringMap;
  messageContentType?: string;
  messageUrlParams?: {
    database?: string;
  };
  clientProtocolHeaderRequired?: boolean;
  concurrentRequestLimit?: number;
  supportsCrossDomainXhr?: boolean;
  testUrl?: string;
  sendRawJson?: boolean;
  httpSessionIdParam?: string;
  httpHeadersOverwriteParam?: string;
  backgroundChannelTest?: boolean;
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
  halfClose(): void;
  listen<T>(type: EventType, cb: (param: T) => void): void;
  send<T>(msg: T): void;
}

export interface WebChannelTransport {
  createWebChannel(url: string, options: WebChannelOptions): WebChannel;
}

export function createWebChannelTransport(): WebChannelTransport;

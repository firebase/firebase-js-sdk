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

export var Event: {
  STAT_EVENT: string;
};

export var Stat: {
  PROXY: number;
  NOPROXY: number;
  BACKCHANNEL_DEAD: number;
  BACKCHANNEL_MISSING: number;
  BROWSER_OFFLINE: number;
  CONNECT_ATTEMPT: number;
  ERROR_NETWORK: number;
  ERROR_OTHER: number;
  REQUEST_BAD_DATA: number;
  REQUEST_BAD_STATUS: number;
  REQUEST_INCOMPLETE_DATA: number;
  REQUEST_NO_DATA: number;
  REQUEST_TIMEOUT: number;
  REQUEST_UNKNOWN_SESSION_ID: number;
  TEST_STAGE_ONE_FAILED: number;
  TEST_STAGE_ONE_START: number;
  TEST_STAGE_TWO_DATA_BOTH: number;
  TEST_STAGE_TWO_DATA_ONE: number;
  TEST_STAGE_TWO_DATA_TWO: number;
  TEST_STAGE_TWO_FAILED: number;
  TEST_STAGE_TWO_START: number;
};


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

  setWithCredentials(withCredentials: boolean): void;
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
  encodeInitMessageHeaders?: boolean;
  forceLongPolling?: boolean;
  detectBufferingProxy?: boolean;
  longPollingTimeout?: number;
  fastHandshake?: boolean;
  disableRedac?: boolean;
  clientProfile?: string;
  internalChannelParams?: {
    forwardChannelRequestTimeoutMs?: number;
  };
  useFetchStreams?: boolean;
  xmlHttpFactory?: unknown;
  requestRefreshThresholds?: { [key: string]: number };
}

export interface EventTarget {
  listen(type: string | number, cb: (param: unknown) => void): void;
}

export interface WebChannel extends EventTarget {
  open(): void;
  close(): void;
  send(msg: unknown): void;
}

export interface StatEvent {
  stat: number;
}

export interface WebChannelTransport {
  createWebChannel(url: string, options: WebChannelOptions): WebChannel;
}

export function createWebChannelTransport(): WebChannelTransport;

export function getStatEventTarget(): EventTarget;

export class FetchXmlHttpFactory {
  constructor(options: {});
}

// See https://google.github.io/closure-library/api/goog.crypt.Md5.html
// Unit test are written in
// packages/firestore/test/unit/core/webchannel_wrapper.test.ts
export class Md5 {
  reset(): void;
  digest(): Array<number>;
  update(bytes: Array<number> | Uint8Array | string, opt_length?: number): void;
}

// See https://google.github.io/closure-library/api/goog.math.Integer.html
// Unit test are written in
// packages/firestore/test/unit/core/webchannel_wrapper.test.ts
export class Integer {
  constructor(bits: Array<number>, sign: number);
  add(other: Integer): Integer;
  multiply(other: Integer): Integer;
  modulo(other: Integer): Integer;
  compare(other: Integer): number;
  toNumber(): number;
  toString(opt_radix?: number): string;
  getBits(index: number): number;
  static fromNumber(value: number): Integer;
  static fromString(str: string, opt_radix?: number): Integer;
}

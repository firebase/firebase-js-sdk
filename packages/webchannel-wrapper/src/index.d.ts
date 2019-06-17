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

// TODO(mikelehen): Flesh out proper types (or figure out how to generate via
// clutz or something).
export class XhrIo {}
export const ErrorCode: any;
export const EventType: any;
export namespace WebChannel {
  export type EventType = any;
  export const EventType: any;
}

type StringMap = { [key: string]: string };

export interface WebChannelOptions {
  messageHeaders?: StringMap;
  initMessageHeaders?: StringMap;
  messageContentType?: string;
  messageUrlParams?: StringMap;
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
  internalChannelParams?: { [key: string]: boolean | number };
  xmlHttpFactory?: unknown;
  requestRefreshThresholds?: { [key: string]: number };
}

export interface WebChannelTransport {
  createWebChannel(url: string, options: WebChannelOptions): any;
}

export function createWebChannelTransport(): WebChannelTransport;

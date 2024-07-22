/**
 * @license
 * Copyright 2021 Google LLC
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

import {
  Connection,
  ConnectionType,
  ErrorCode
} from '../../implementation/connection';
import { internalError } from '../../implementation/error';
import { fetch as undiciFetch, Headers as undiciHeaders } from 'undici';
import { ReadableStream } from 'stream/web';

/** An override for the text-based Connection. Used in tests. */
let textFactoryOverride: (() => Connection<string>) | null = null;

/**
 * Network layer that works in Node.
 *
 * This network implementation should not be used in browsers as it does not
 * support progress updates.
 */
abstract class FetchConnection<T extends ConnectionType>
  implements Connection<T>
{
  protected errorCode_: ErrorCode;
  protected statusCode_: number | undefined;
  protected body_: ArrayBuffer | undefined;
  protected errorText_ = '';
  protected headers_: undiciHeaders | undefined;
  protected sent_: boolean = false;
  protected fetch_ = undiciFetch;

  constructor() {
    this.errorCode_ = ErrorCode.NO_ERROR;
  }

  async send(
    url: string,
    method: string,
    body?: NodeJS.ArrayBufferView | Blob | string,
    headers?: Record<string, string>
  ): Promise<void> {
    if (this.sent_) {
      throw internalError('cannot .send() more than once');
    }
    this.sent_ = true;

    try {
      const response = await this.fetch_(url, {
        method,
        headers: headers || {},
        body: body as NodeJS.ArrayBufferView | string
      });
      this.headers_ = response.headers;
      this.statusCode_ = response.status;
      this.errorCode_ = ErrorCode.NO_ERROR;
      this.body_ = await response.arrayBuffer();
    } catch (e) {
      this.errorText_ = (e as Error)?.message;
      // emulate XHR which sets status to 0 when encountering a network error
      this.statusCode_ = 0;
      this.errorCode_ = ErrorCode.NETWORK_ERROR;
    }
  }

  getErrorCode(): ErrorCode {
    if (this.errorCode_ === undefined) {
      throw internalError('cannot .getErrorCode() before receiving response');
    }
    return this.errorCode_;
  }

  getStatus(): number {
    if (this.statusCode_ === undefined) {
      throw internalError('cannot .getStatus() before receiving response');
    }
    return this.statusCode_;
  }

  abstract getResponse(): T;

  getErrorText(): string {
    return this.errorText_;
  }

  abort(): void {
    // Not supported
  }

  getResponseHeader(header: string): string | null {
    if (!this.headers_) {
      throw internalError(
        'cannot .getResponseHeader() before receiving response'
      );
    }
    return this.headers_.get(header);
  }

  addUploadProgressListener(listener: (p1: ProgressEvent) => void): void {
    // Not supported
  }

  removeUploadProgressListener(listener: (p1: ProgressEvent) => void): void {
    // Not supported
  }
}

export class FetchTextConnection extends FetchConnection<string> {
  getResponse(): string {
    if (!this.body_) {
      throw internalError('cannot .getResponse() before receiving response');
    }
    return Buffer.from(this.body_).toString('utf-8');
  }
}

export function newTextConnection(): Connection<string> {
  return textFactoryOverride
    ? textFactoryOverride()
    : new FetchTextConnection();
}

export class FetchBytesConnection extends FetchConnection<ArrayBuffer> {
  getResponse(): ArrayBuffer {
    if (!this.body_) {
      throw internalError('cannot .getResponse() before sending');
    }
    return this.body_;
  }
}

export function newBytesConnection(): Connection<ArrayBuffer> {
  return new FetchBytesConnection();
}

export class FetchStreamConnection extends FetchConnection<ReadableStream> {
  private stream_: ReadableStream | null = null;

  async send(
    url: string,
    method: string,
    body?: NodeJS.ArrayBufferView | Blob | string,
    headers?: Record<string, string>
  ): Promise<void> {
    if (this.sent_) {
      throw internalError('cannot .send() more than once');
    }
    this.sent_ = true;

    try {
      const response = await this.fetch_(url, {
        method,
        headers: headers || {},
        body: body as NodeJS.ArrayBufferView | string
      });
      this.headers_ = response.headers;
      this.statusCode_ = response.status;
      this.errorCode_ = ErrorCode.NO_ERROR;
      this.stream_ = response.body;
    } catch (e) {
      this.errorText_ = (e as Error)?.message;
      // emulate XHR which sets status to 0 when encountering a network error
      this.statusCode_ = 0;
      this.errorCode_ = ErrorCode.NETWORK_ERROR;
    }
  }

  getResponse(): ReadableStream {
    if (!this.stream_) {
      throw internalError('cannot .getResponse() before sending');
    }
    return this.stream_;
  }
}

export function newStreamConnection(): Connection<ReadableStream> {
  return new FetchStreamConnection();
}

export function newBlobConnection(): Connection<Blob> {
  throw new Error('Blobs are not supported on Node');
}

export function injectTestConnection(
  factory: (() => Connection<string>) | null
): void {
  textFactoryOverride = factory;
}

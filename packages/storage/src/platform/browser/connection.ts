/**
 * @license
 * Copyright 2017 Google LLC
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

import { isCloudWorkstation } from '@firebase/util';
import {
  Connection,
  ConnectionType,
  ErrorCode,
  Headers
} from '../../implementation/connection';
import { internalError } from '../../implementation/error';

/** An override for the text-based Connection. Used in tests. */
let textFactoryOverride: (() => Connection<string>) | null = null;

/**
 * Network layer for browsers. We use this instead of goog.net.XhrIo because
 * goog.net.XhrIo is hyuuuuge and doesn't work in React Native on Android.
 */
abstract class XhrConnection<T extends ConnectionType>
  implements Connection<T>
{
  protected xhr_: XMLHttpRequest;
  private errorCode_: ErrorCode;
  private sendPromise_: Promise<void>;
  protected sent_: boolean = false;

  constructor() {
    this.xhr_ = new XMLHttpRequest();
    this.initXhr();
    this.errorCode_ = ErrorCode.NO_ERROR;
    this.sendPromise_ = new Promise(resolve => {
      this.xhr_.addEventListener('abort', () => {
        this.errorCode_ = ErrorCode.ABORT;
        resolve();
      });
      this.xhr_.addEventListener('error', () => {
        this.errorCode_ = ErrorCode.NETWORK_ERROR;
        resolve();
      });
      this.xhr_.addEventListener('load', () => {
        resolve();
      });
    });
  }

  abstract initXhr(): void;

  send(
    url: string,
    method: string,
    isUsingEmulator: boolean,
    body?: ArrayBufferView | Blob | string,
    headers?: Headers
  ): Promise<void> {
    if (this.sent_) {
      throw internalError('cannot .send() more than once');
    }
    if (isCloudWorkstation(url) && isUsingEmulator) {
      this.xhr_.withCredentials = true;
    }
    this.sent_ = true;
    this.xhr_.open(method, url, true);
    if (headers !== undefined) {
      for (const key in headers) {
        if (headers.hasOwnProperty(key)) {
          this.xhr_.setRequestHeader(key, headers[key].toString());
        }
      }
    }
    if (body !== undefined) {
      this.xhr_.send(body);
    } else {
      this.xhr_.send();
    }
    return this.sendPromise_;
  }

  getErrorCode(): ErrorCode {
    if (!this.sent_) {
      throw internalError('cannot .getErrorCode() before sending');
    }
    return this.errorCode_;
  }

  getStatus(): number {
    if (!this.sent_) {
      throw internalError('cannot .getStatus() before sending');
    }
    try {
      return this.xhr_.status;
    } catch (e) {
      return -1;
    }
  }

  getResponse(): T {
    if (!this.sent_) {
      throw internalError('cannot .getResponse() before sending');
    }
    return this.xhr_.response;
  }

  getErrorText(): string {
    if (!this.sent_) {
      throw internalError('cannot .getErrorText() before sending');
    }
    return this.xhr_.statusText;
  }

  /** Aborts the request. */
  abort(): void {
    this.xhr_.abort();
  }

  getResponseHeader(header: string): string | null {
    return this.xhr_.getResponseHeader(header);
  }

  addUploadProgressListener(listener: (p1: ProgressEvent) => void): void {
    if (this.xhr_.upload != null) {
      this.xhr_.upload.addEventListener('progress', listener);
    }
  }

  removeUploadProgressListener(listener: (p1: ProgressEvent) => void): void {
    if (this.xhr_.upload != null) {
      this.xhr_.upload.removeEventListener('progress', listener);
    }
  }
}

export class XhrTextConnection extends XhrConnection<string> {
  initXhr(): void {
    this.xhr_.responseType = 'text';
  }
}

export function newTextConnection(): Connection<string> {
  return textFactoryOverride ? textFactoryOverride() : new XhrTextConnection();
}

export class XhrBytesConnection extends XhrConnection<ArrayBuffer> {
  private data_?: ArrayBuffer;

  initXhr(): void {
    this.xhr_.responseType = 'arraybuffer';
  }
}

export function newBytesConnection(): Connection<ArrayBuffer> {
  return new XhrBytesConnection();
}

export class XhrBlobConnection extends XhrConnection<Blob> {
  initXhr(): void {
    this.xhr_.responseType = 'blob';
  }
}

export function newBlobConnection(): Connection<Blob> {
  return new XhrBlobConnection();
}

export function newStreamConnection(): Connection<ReadableStream> {
  throw new Error('Streams are only supported on Node');
}

export function injectTestConnection(
  factory: (() => Connection<string>) | null
): void {
  textFactoryOverride = factory;
}

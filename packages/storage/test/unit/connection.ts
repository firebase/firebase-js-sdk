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
import {
  ErrorCode,
  Headers,
  Connection
} from '../../src/implementation/connection';
import { StorageError, StorageErrorCode } from '../../src/implementation/error';

export type SendHook = (
  connection: TestingConnection,
  url: string,
  method: string,
  body?: ArrayBufferView | Blob | string | null,
  headers?: Headers
) => void;

export enum State {
  START = 0,
  SENT = 1,
  DONE = 2
}

export class TestingConnection implements Connection<string> {
  private state: State;
  private sendPromise: Promise<void>;
  private resolve!: () => void;
  private sendHook: SendHook | null;
  private status: number;
  private responseText: string;
  private headers: Headers;
  private errorCode: ErrorCode;

  constructor(sendHook: SendHook | null) {
    this.state = State.START;
    this.sendPromise = new Promise(resolve => {
      this.resolve = resolve;
    });
    this.sendHook = sendHook;
    this.status = -1;
    this.responseText = '';
    this.headers = {};
    this.errorCode = ErrorCode.NO_ERROR;
  }

  send(
    url: string,
    method: string,
    _isUsingEmulator: boolean,
    body?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Promise<void> {
    if (this.state !== State.START) {
      throw new StorageError(StorageErrorCode.UNKNOWN, "Can't send again");
    }

    this.state = State.SENT;
    if (this.sendHook !== null) {
      this.sendHook.call(null, this, url, method, body, headers);
    }

    return this.sendPromise;
  }

  simulateResponse(
    status: number,
    body: string,
    headers: { [key: string]: string }
  ): void {
    if (this.state !== State.SENT) {
      throw new StorageError(
        StorageErrorCode.UNKNOWN,
        "Can't simulate response before send/more than once"
      );
    }

    this.status = status;
    this.responseText = body;
    this.headers = {};
    for (const [key, value] of Object.entries(headers)) {
      this.headers[key.toLowerCase()] = value.toString();
    }
    this.errorCode = ErrorCode.NO_ERROR;

    this.state = State.DONE;
    this.resolve();
  }

  getErrorCode(): ErrorCode {
    return this.errorCode;
  }

  getStatus(): number {
    return this.status;
  }

  getResponse(): string {
    return this.responseText;
  }

  getErrorText(): string {
    return this.responseText;
  }

  abort(): void {
    this.state = State.START;
    this.errorCode = ErrorCode.ABORT;
    this.resolve();
  }

  getResponseHeader(header: string): string | null {
    const headerValue = this.headers[header.toLowerCase()];
    if (headerValue != null) {
      return headerValue;
    } else {
      return null;
    }
  }
  // eslint-disable-next-line
  addUploadProgressListener(): void {
    // TODO(andysoto): impl
  }
  // eslint-disable-next-line
  removeUploadProgressListener(): void {
    // TODO(andysoto): impl
  }
}

export function newTestConnection(
  sendHook?: SendHook | null
): Connection<string> {
  return new TestingConnection(sendHook ?? null);
}

/**
* Copyright 2017 Google Inc.
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
import { forEach } from '../src/implementation/object';
import * as promiseimpl from '../src/implementation/promise_external';
import * as type from '../src/implementation/type';
import {
  ErrorCode,
  Headers,
  XhrIo
} from '../src/implementation/xhrio';

export type SendHook = (
  xhrio: TestingXhrIo,
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

export type StringHeaders = { [name: string]: string };

export class TestingXhrIo implements XhrIo {
  private state: State;
  private sendPromise: Promise<XhrIo>;
  private resolve: (XhrIo) => void;
  private sendHook: SendHook;
  private status: number;
  private responseText: string;
  private headers: StringHeaders;
  private errorCode: ErrorCode;

  constructor(sendHook: SendHook) {
    this.state = State.START;
    this.sendPromise = this.sendPromise = promiseimpl.make<
      XhrIo
    >((resolve, reject) => {
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
    body?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Promise<XhrIo> {
    if (this.state !== State.START) {
      throw new Error("Can't send again");
    }

    this.state = State.SENT;
    if (this.sendHook !== null) {
      this.sendHook.call(null, this, url, method, body, headers);
    }

    return this.sendPromise;
  }

  simulateResponse(status: number, body: string, headers: Headers) {
    if (this.state !== State.SENT) {
      throw new Error("Can't simulate response before send/more than once");
    }

    this.status = status;
    this.responseText = body;
    this.headers = {};
    forEach(headers, (key: string, val: string | number) => {
      this.headers[key.toLowerCase()] = val.toString();
    });
    this.errorCode = ErrorCode.NO_ERROR;

    this.state = State.DONE;
    this.resolve(this);
  }

  getErrorCode(): ErrorCode {
    return this.errorCode;
  }

  getStatus(): number {
    return this.status;
  }

  getResponseText(): string {
    return this.responseText;
  }

  abort(): void {
    this.state = State.START;
    this.errorCode = ErrorCode.NO_ERROR;
    this.resolve(this);
  }

  getResponseHeader(header: string) {
    const headerValue = this.headers[header.toLowerCase()];
    if (type.isDef(headerValue)) {
      return headerValue;
    } else {
      return null;
    }
  }

  addUploadProgressListener(listener): void {
    // TODO(andysoto): impl
  }

  removeUploadProgressListener(listener): void {
    // TODO(andysoto): impl
  }
}

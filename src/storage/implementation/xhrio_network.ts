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
import * as errorsExports from './error';
import * as object from './object';
import * as promiseimpl from './promise_external';
import * as type from './type';
import * as XhrIoExports from './xhrio';
import { Headers, XhrIo } from './xhrio';

/**
 * We use this instead of goog.net.XhrIo because goog.net.XhrIo is hyuuuuge and
 * doesn't work in React Native on Android.
 */
export class NetworkXhrIo implements XhrIo {
  private xhr_: XMLHttpRequest;
  private errorCode_: XhrIoExports.ErrorCode;
  private sendPromise_: Promise<XhrIo>;
  private sent_: boolean = false;

  constructor() {
    this.xhr_ = new XMLHttpRequest();
    this.errorCode_ = XhrIoExports.ErrorCode.NO_ERROR;
    this.sendPromise_ = promiseimpl.make((resolve, reject) => {
      this.xhr_.addEventListener('abort', event => {
        this.errorCode_ = XhrIoExports.ErrorCode.ABORT;
        resolve(this);
      });
      this.xhr_.addEventListener('error', event => {
        this.errorCode_ = XhrIoExports.ErrorCode.NETWORK_ERROR;
        resolve(this);
      });
      this.xhr_.addEventListener('load', event => {
        resolve(this);
      });
    });
  }

  /**
   * @override
   */
  send(
    url: string,
    method: string,
    opt_body?: ArrayBufferView | Blob | string | null,
    opt_headers?: Headers
  ): Promise<XhrIo> {
    if (this.sent_) {
      throw errorsExports.internalError('cannot .send() more than once');
    }
    this.sent_ = true;
    this.xhr_.open(method, url, true);
    if (type.isDef(opt_headers)) {
      const headers = opt_headers as Headers;
      object.forEach(headers, (key, val) => {
        this.xhr_.setRequestHeader(key, val.toString());
      });
    }
    if (type.isDef(opt_body)) {
      this.xhr_.send(opt_body);
    } else {
      this.xhr_.send();
    }
    return this.sendPromise_;
  }

  /**
   * @override
   */
  getErrorCode(): XhrIoExports.ErrorCode {
    if (!this.sent_) {
      throw errorsExports.internalError(
        'cannot .getErrorCode() before sending'
      );
    }
    return this.errorCode_;
  }

  /**
   * @override
   */
  getStatus(): number {
    if (!this.sent_) {
      throw errorsExports.internalError('cannot .getStatus() before sending');
    }
    try {
      return this.xhr_.status;
    } catch (e) {
      return -1;
    }
  }

  /**
   * @override
   */
  getResponseText(): string {
    if (!this.sent_) {
      throw errorsExports.internalError(
        'cannot .getResponseText() before sending'
      );
    }
    return this.xhr_.responseText;
  }

  /**
   * Aborts the request.
   * @override
   */
  abort() {
    this.xhr_.abort();
  }

  /**
   * @override
   */
  getResponseHeader(header: string): string | null {
    return this.xhr_.getResponseHeader(header);
  }

  /**
   * @override
   */
  addUploadProgressListener(listener: (p1: Event) => void) {
    if (type.isDef(this.xhr_.upload)) {
      this.xhr_.upload.addEventListener('progress', listener);
    }
  }

  /**
   * @override
   */
  removeUploadProgressListener(listener: (p1: Event) => void) {
    if (type.isDef(this.xhr_.upload)) {
      this.xhr_.upload.removeEventListener('progress', listener);
    }
  }
}

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

/**
 * @fileoverview Defines methods used to actually send HTTP requests from
 * abstract representations.
 */

import { start, stop, id as backoffId } from './backoff';
import {
  FirebaseStorageError,
  unknown,
  appDeleted,
  canceled,
  retryLimitExceeded
} from './error';
import { RequestInfo } from './requestinfo';
import { isJustDef } from './type';
import { makeQueryString } from './url';
import { Headers, Connection, ErrorCode } from './connection';
import { ConnectionPool } from './connectionPool';

export interface Request<T> {
  getPromise(): Promise<T>;

  /**
   * Cancels the request. IMPORTANT: the promise may still be resolved with an
   * appropriate value (if the request is finished before you call this method,
   * but the promise has not yet been resolved), so don't just assume it will be
   * rejected if you call this function.
   * @param appDelete - True if the cancelation came from the app being deleted.
   */
  cancel(appDelete?: boolean): void;
}

class NetworkRequest<T> implements Request<T> {
  private url_: string;
  private method_: string;
  private headers_: Headers;
  private body_: string | Blob | Uint8Array | null;
  private successCodes_: number[];
  private additionalRetryCodes_: number[];
  private pendingConnection_: Connection | null = null;
  private backoffId_: backoffId | null = null;
  private resolve_!: (value?: T | PromiseLike<T>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private reject_!: (reason?: any) => void;
  private canceled_: boolean = false;
  private appDelete_: boolean = false;
  private callback_: (p1: Connection, p2: string) => T;
  private errorCallback_:
    | ((p1: Connection, p2: FirebaseStorageError) => FirebaseStorageError)
    | null;
  private progressCallback_: ((p1: number, p2: number) => void) | null;
  private timeout_: number;
  private pool_: ConnectionPool;
  promise_: Promise<T>;

  constructor(
    url: string,
    method: string,
    headers: Headers,
    body: string | Blob | Uint8Array | null,
    successCodes: number[],
    additionalRetryCodes: number[],
    callback: (p1: Connection, p2: string) => T,
    errorCallback:
      | ((p1: Connection, p2: FirebaseStorageError) => FirebaseStorageError)
      | null,
    timeout: number,
    progressCallback: ((p1: number, p2: number) => void) | null,
    pool: ConnectionPool
  ) {
    this.url_ = url;
    this.method_ = method;
    this.headers_ = headers;
    this.body_ = body;
    this.successCodes_ = successCodes.slice();
    this.additionalRetryCodes_ = additionalRetryCodes.slice();
    this.callback_ = callback;
    this.errorCallback_ = errorCallback;
    this.progressCallback_ = progressCallback;
    this.timeout_ = timeout;
    this.pool_ = pool;
    this.promise_ = new Promise((resolve, reject) => {
      this.resolve_ = resolve as (value?: T | PromiseLike<T>) => void;
      this.reject_ = reject;
      this.start_();
    });
  }

  /**
   * Actually starts the retry loop.
   */
  private start_(): void {
    const self = this;

    function doTheRequest(
      backoffCallback: (p1: boolean, ...p2: unknown[]) => void,
      canceled: boolean
    ): void {
      if (canceled) {
        backoffCallback(false, new RequestEndStatus(false, null, true));
        return;
      }
      const connection = self.pool_.createConnection();
      self.pendingConnection_ = connection;

      function progressListener(progressEvent: ProgressEvent): void {
        const loaded = progressEvent.loaded;
        const total = progressEvent.lengthComputable ? progressEvent.total : -1;
        if (self.progressCallback_ !== null) {
          self.progressCallback_(loaded, total);
        }
      }
      if (self.progressCallback_ !== null) {
        connection.addUploadProgressListener(progressListener);
      }

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      connection
        .send(self.url_, self.method_, self.body_, self.headers_)
        .then(() => {
          if (self.progressCallback_ !== null) {
            connection.removeUploadProgressListener(progressListener);
          }
          self.pendingConnection_ = null;
          const hitServer = connection.getErrorCode() === ErrorCode.NO_ERROR;
          const status = connection.getStatus();
          if (!hitServer || self.isRetryStatusCode_(status)) {
            const wasCanceled = connection.getErrorCode() === ErrorCode.ABORT;
            backoffCallback(
              false,
              new RequestEndStatus(false, null, wasCanceled)
            );
            return;
          }
          const successCode = self.successCodes_.indexOf(status) !== -1;
          backoffCallback(true, new RequestEndStatus(successCode, connection));
        });
    }

    /**
     * @param requestWentThrough - True if the request eventually went
     *     through, false if it hit the retry limit or was canceled.
     */
    function backoffDone(
      requestWentThrough: boolean,
      status: RequestEndStatus
    ): void {
      const resolve = self.resolve_;
      const reject = self.reject_;
      const connection = status.connection as Connection;
      if (status.wasSuccessCode) {
        try {
          const result = self.callback_(
            connection,
            connection.getResponseText()
          );
          if (isJustDef(result)) {
            resolve(result);
          } else {
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      } else {
        if (connection !== null) {
          const err = unknown();
          err.serverResponse = connection.getResponseText();
          if (self.errorCallback_) {
            reject(self.errorCallback_(connection, err));
          } else {
            reject(err);
          }
        } else {
          if (status.canceled) {
            const err = self.appDelete_ ? appDeleted() : canceled();
            reject(err);
          } else {
            const err = retryLimitExceeded();
            reject(err);
          }
        }
      }
    }
    if (this.canceled_) {
      backoffDone(false, new RequestEndStatus(false, null, true));
    } else {
      this.backoffId_ = start(doTheRequest, backoffDone, this.timeout_);
    }
  }

  /** @inheritDoc */
  getPromise(): Promise<T> {
    return this.promise_;
  }

  /** @inheritDoc */
  cancel(appDelete?: boolean): void {
    this.canceled_ = true;
    this.appDelete_ = appDelete || false;
    if (this.backoffId_ !== null) {
      stop(this.backoffId_);
    }
    if (this.pendingConnection_ !== null) {
      this.pendingConnection_.abort();
    }
  }

  private isRetryStatusCode_(status: number): boolean {
    // The codes for which to retry came from this page:
    // https://cloud.google.com/storage/docs/exponential-backoff
    const isFiveHundredCode = status >= 500 && status < 600;
    const extraRetryCodes = [
      // Request Timeout: web server didn't receive full request in time.
      408,
      // Too Many Requests: you're getting rate-limited, basically.
      429
    ];
    const isExtraRetryCode = extraRetryCodes.indexOf(status) !== -1;
    const isRequestSpecificRetryCode =
      this.additionalRetryCodes_.indexOf(status) !== -1;
    return isFiveHundredCode || isExtraRetryCode || isRequestSpecificRetryCode;
  }
}

/**
 * A collection of information about the result of a network request.
 * @param opt_canceled - Defaults to false.
 */
export class RequestEndStatus {
  /**
   * True if the request was canceled.
   */
  canceled: boolean;

  constructor(
    public wasSuccessCode: boolean,
    public connection: Connection | null,
    canceled?: boolean
  ) {
    this.canceled = !!canceled;
  }
}

export function addAuthHeader_(
  headers: Headers,
  authToken: string | null
): void {
  if (authToken !== null && authToken.length > 0) {
    headers['Authorization'] = 'Firebase ' + authToken;
  }
}

export function addVersionHeader_(
  headers: Headers,
  firebaseVersion?: string
): void {
  headers['X-Firebase-Storage-Version'] =
    'webjs/' + (firebaseVersion ?? 'AppManager');
}

export function addGmpidHeader_(headers: Headers, appId: string | null): void {
  if (appId) {
    headers['X-Firebase-GMPID'] = appId;
  }
}

export function addAppCheckHeader_(
  headers: Headers,
  appCheckToken: string | null
): void {
  if (appCheckToken !== null) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }
}

export function makeRequest<T>(
  requestInfo: RequestInfo<T>,
  appId: string | null,
  authToken: string | null,
  appCheckToken: string | null,
  pool: ConnectionPool,
  firebaseVersion?: string
): Request<T> {
  const queryPart = makeQueryString(requestInfo.urlParams);
  const url = requestInfo.url + queryPart;
  const headers = Object.assign({}, requestInfo.headers);
  addGmpidHeader_(headers, appId);
  addAuthHeader_(headers, authToken);
  addVersionHeader_(headers, firebaseVersion);
  addAppCheckHeader_(headers, appCheckToken);
  return new NetworkRequest<T>(
    url,
    requestInfo.method,
    headers,
    requestInfo.body,
    requestInfo.successCodes,
    requestInfo.additionalRetryCodes,
    requestInfo.handler,
    requestInfo.errorHandler,
    requestInfo.timeout,
    requestInfo.progressCallback,
    pool
  );
}

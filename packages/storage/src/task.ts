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
 * @fileoverview Defines types for interacting with blob transfer tasks.
 */

import { FbsBlob } from './implementation/blob';
import {
  canceled,
  StorageErrorCode,
  StorageError,
  retryLimitExceeded
} from './implementation/error';
import {
  InternalTaskState,
  TaskEvent,
  TaskState,
  taskStateFromInternalTaskState
} from './implementation/taskenums';
import { Metadata } from './metadata';
import {
  Observer,
  Subscribe,
  Unsubscribe,
  StorageObserver as StorageObserverInternal,
  NextFn
} from './implementation/observer';
import { Request } from './implementation/request';
import { UploadTaskSnapshot, StorageObserver } from './public-types';
import { async as fbsAsync } from './implementation/async';
import { Mappings, getMappings } from './implementation/metadata';
import {
  createResumableUpload,
  getResumableUploadStatus,
  RESUMABLE_UPLOAD_CHUNK_SIZE,
  ResumableUploadStatus,
  continueResumableUpload,
  getMetadata,
  multipartUpload
} from './implementation/requests';
import { Reference } from './reference';
import { newTextConnection } from './platform/connection';
import { isRetryStatusCode } from './implementation/utils';
import { CompleteFn } from '@firebase/util';
import { DEFAULT_MIN_SLEEP_TIME_MILLIS } from './implementation/constants';

/**
 * Represents a blob being uploaded. Can be used to pause/resume/cancel the
 * upload and manage callbacks for various events.
 * @internal
 */
export class UploadTask {
  private _ref: Reference;
  /**
   * The data to be uploaded.
   */
  _blob: FbsBlob;
  /**
   * Metadata related to the upload.
   */
  _metadata: Metadata | null;
  private _mappings: Mappings;
  /**
   * Number of bytes transferred so far.
   */
  _transferred: number = 0;
  private _needToFetchStatus: boolean = false;
  private _needToFetchMetadata: boolean = false;
  private _observers: Array<StorageObserverInternal<UploadTaskSnapshot>> = [];
  private _resumable: boolean;
  /**
   * Upload state.
   */
  _state: InternalTaskState;
  private _error?: StorageError = undefined;
  private _uploadUrl?: string = undefined;
  private _request?: Request<unknown> = undefined;
  private _chunkMultiplier: number = 1;
  private _errorHandler: (p1: StorageError) => void;
  private _metadataErrorHandler: (p1: StorageError) => void;
  private _resolve?: (p1: UploadTaskSnapshot) => void = undefined;
  private _reject?: (p1: StorageError) => void = undefined;
  private pendingTimeout?: ReturnType<typeof setTimeout>;
  private _promise: Promise<UploadTaskSnapshot>;

  private sleepTime: number;

  private maxSleepTime: number;

  isExponentialBackoffExpired(): boolean {
    return this.sleepTime > this.maxSleepTime;
  }

  /**
   * @param ref - The firebaseStorage.Reference object this task came
   *     from, untyped to avoid cyclic dependencies.
   * @param blob - The blob to upload.
   */
  constructor(ref: Reference, blob: FbsBlob, metadata: Metadata | null = null) {
    this._ref = ref;
    this._blob = blob;
    this._metadata = metadata;
    this._mappings = getMappings();
    this._resumable = this._shouldDoResumable(this._blob);
    this._state = InternalTaskState.RUNNING;
    this._errorHandler = error => {
      this._request = undefined;
      this._chunkMultiplier = 1;
      if (error._codeEquals(StorageErrorCode.CANCELED)) {
        this._needToFetchStatus = true;
        this.completeTransitions_();
      } else {
        const backoffExpired = this.isExponentialBackoffExpired();
        if (isRetryStatusCode(error.status, [])) {
          if (backoffExpired) {
            error = retryLimitExceeded();
          } else {
            this.sleepTime = Math.max(
              this.sleepTime * 2,
              DEFAULT_MIN_SLEEP_TIME_MILLIS
            );
            this._needToFetchStatus = true;
            this.completeTransitions_();
            return;
          }
        }
        this._error = error;
        this._transition(InternalTaskState.ERROR);
      }
    };
    this._metadataErrorHandler = error => {
      this._request = undefined;
      if (error._codeEquals(StorageErrorCode.CANCELED)) {
        this.completeTransitions_();
      } else {
        this._error = error;
        this._transition(InternalTaskState.ERROR);
      }
    };
    this.sleepTime = 0;
    this.maxSleepTime = this._ref.storage.maxUploadRetryTime;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      this._start();
    });

    // Prevent uncaught rejections on the internal promise from bubbling out
    // to the top level with a dummy handler.
    this._promise.then(null, () => {});
  }

  private _makeProgressCallback(): (p1: number, p2: number) => void {
    const sizeBefore = this._transferred;
    return loaded => this._updateProgress(sizeBefore + loaded);
  }

  private _shouldDoResumable(blob: FbsBlob): boolean {
    return blob.size() > 256 * 1024;
  }

  private _start(): void {
    if (this._state !== InternalTaskState.RUNNING) {
      // This can happen if someone pauses us in a resume callback, for example.
      return;
    }
    if (this._request !== undefined) {
      return;
    }
    if (this._resumable) {
      if (this._uploadUrl === undefined) {
        this._createResumable();
      } else {
        if (this._needToFetchStatus) {
          this._fetchStatus();
        } else {
          if (this._needToFetchMetadata) {
            // Happens if we miss the metadata on upload completion.
            this._fetchMetadata();
          } else {
            this.pendingTimeout = setTimeout(() => {
              this.pendingTimeout = undefined;
              this._continueUpload();
            }, this.sleepTime);
          }
        }
      }
    } else {
      this._oneShotUpload();
    }
  }

  private _resolveToken(
    callback: (authToken: string | null, appCheckToken: string | null) => void
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.all([
      this._ref.storage._getAuthToken(),
      this._ref.storage._getAppCheckToken()
    ]).then(([authToken, appCheckToken]) => {
      switch (this._state) {
        case InternalTaskState.RUNNING:
          callback(authToken, appCheckToken);
          break;
        case InternalTaskState.CANCELING:
          this._transition(InternalTaskState.CANCELED);
          break;
        case InternalTaskState.PAUSING:
          this._transition(InternalTaskState.PAUSED);
          break;
        default:
      }
    });
  }

  // TODO(andysoto): assert false

  private _createResumable(): void {
    this._resolveToken((authToken, appCheckToken) => {
      const requestInfo = createResumableUpload(
        this._ref.storage,
        this._ref._location,
        this._mappings,
        this._blob,
        this._metadata
      );
      const createRequest = this._ref.storage._makeRequest(
        requestInfo,
        newTextConnection,
        authToken,
        appCheckToken
      );
      this._request = createRequest;
      createRequest.getPromise().then((url: string) => {
        this._request = undefined;
        this._uploadUrl = url;
        this._needToFetchStatus = false;
        this.completeTransitions_();
      }, this._errorHandler);
    });
  }

  private _fetchStatus(): void {
    // TODO(andysoto): assert(this.uploadUrl_ !== null);
    const url = this._uploadUrl as string;
    this._resolveToken((authToken, appCheckToken) => {
      const requestInfo = getResumableUploadStatus(
        this._ref.storage,
        this._ref._location,
        url,
        this._blob
      );
      const statusRequest = this._ref.storage._makeRequest(
        requestInfo,
        newTextConnection,
        authToken,
        appCheckToken
      );
      this._request = statusRequest;
      statusRequest.getPromise().then(status => {
        status = status as ResumableUploadStatus;
        this._request = undefined;
        this._updateProgress(status.current);
        this._needToFetchStatus = false;
        if (status.finalized) {
          this._needToFetchMetadata = true;
        }
        this.completeTransitions_();
      }, this._errorHandler);
    });
  }

  private _continueUpload(): void {
    const chunkSize = RESUMABLE_UPLOAD_CHUNK_SIZE * this._chunkMultiplier;
    const status = new ResumableUploadStatus(
      this._transferred,
      this._blob.size()
    );

    // TODO(andysoto): assert(this.uploadUrl_ !== null);
    const url = this._uploadUrl as string;
    this._resolveToken((authToken, appCheckToken) => {
      let requestInfo;
      try {
        requestInfo = continueResumableUpload(
          this._ref._location,
          this._ref.storage,
          url,
          this._blob,
          chunkSize,
          this._mappings,
          status,
          this._makeProgressCallback()
        );
      } catch (e) {
        this._error = e as StorageError;
        this._transition(InternalTaskState.ERROR);
        return;
      }
      const uploadRequest = this._ref.storage._makeRequest(
        requestInfo,
        newTextConnection,
        authToken,
        appCheckToken,
        /*retry=*/ false // Upload requests should not be retried as each retry should be preceded by another query request. Which is handled in this file.
      );
      this._request = uploadRequest;
      uploadRequest.getPromise().then((newStatus: ResumableUploadStatus) => {
        this._increaseMultiplier();
        this._request = undefined;
        this._updateProgress(newStatus.current);
        if (newStatus.finalized) {
          this._metadata = newStatus.metadata;
          this._transition(InternalTaskState.SUCCESS);
        } else {
          this.completeTransitions_();
        }
      }, this._errorHandler);
    });
  }

  private _increaseMultiplier(): void {
    const currentSize = RESUMABLE_UPLOAD_CHUNK_SIZE * this._chunkMultiplier;

    // Max chunk size is 32M.
    if (currentSize * 2 < 32 * 1024 * 1024) {
      this._chunkMultiplier *= 2;
    }
  }

  private _fetchMetadata(): void {
    this._resolveToken((authToken, appCheckToken) => {
      const requestInfo = getMetadata(
        this._ref.storage,
        this._ref._location,
        this._mappings
      );
      const metadataRequest = this._ref.storage._makeRequest(
        requestInfo,
        newTextConnection,
        authToken,
        appCheckToken
      );
      this._request = metadataRequest;
      metadataRequest.getPromise().then(metadata => {
        this._request = undefined;
        this._metadata = metadata;
        this._transition(InternalTaskState.SUCCESS);
      }, this._metadataErrorHandler);
    });
  }

  private _oneShotUpload(): void {
    this._resolveToken((authToken, appCheckToken) => {
      const requestInfo = multipartUpload(
        this._ref.storage,
        this._ref._location,
        this._mappings,
        this._blob,
        this._metadata
      );
      const multipartRequest = this._ref.storage._makeRequest(
        requestInfo,
        newTextConnection,
        authToken,
        appCheckToken
      );
      this._request = multipartRequest;
      multipartRequest.getPromise().then(metadata => {
        this._request = undefined;
        this._metadata = metadata;
        this._updateProgress(this._blob.size());
        this._transition(InternalTaskState.SUCCESS);
      }, this._errorHandler);
    });
  }

  private _updateProgress(transferred: number): void {
    const old = this._transferred;
    this._transferred = transferred;

    // A progress update can make the "transferred" value smaller (e.g. a
    // partial upload not completed by server, after which the "transferred"
    // value may reset to the value at the beginning of the request).
    if (this._transferred !== old) {
      this._notifyObservers();
    }
  }

  private _transition(state: InternalTaskState): void {
    if (this._state === state) {
      return;
    }
    switch (state) {
      case InternalTaskState.CANCELING:
      case InternalTaskState.PAUSING:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING ||
        //        this.state_ === InternalTaskState.PAUSING);
        this._state = state;
        if (this._request !== undefined) {
          this._request.cancel();
        } else if (this.pendingTimeout) {
          clearTimeout(this.pendingTimeout);
          this.pendingTimeout = undefined;
          this.completeTransitions_();
        }
        break;
      case InternalTaskState.RUNNING:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.PAUSED ||
        //        this.state_ === InternalTaskState.PAUSING);
        const wasPaused = this._state === InternalTaskState.PAUSED;
        this._state = state;
        if (wasPaused) {
          this._notifyObservers();
          this._start();
        }
        break;
      case InternalTaskState.PAUSED:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.PAUSING);
        this._state = state;
        this._notifyObservers();
        break;
      case InternalTaskState.CANCELED:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.PAUSED ||
        //        this.state_ === InternalTaskState.CANCELING);
        this._error = canceled();
        this._state = state;
        this._notifyObservers();
        break;
      case InternalTaskState.ERROR:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING ||
        //        this.state_ === InternalTaskState.PAUSING ||
        //        this.state_ === InternalTaskState.CANCELING);
        this._state = state;
        this._notifyObservers();
        break;
      case InternalTaskState.SUCCESS:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING ||
        //        this.state_ === InternalTaskState.PAUSING ||
        //        this.state_ === InternalTaskState.CANCELING);
        this._state = state;
        this._notifyObservers();
        break;
      default: // Ignore
    }
  }

  private completeTransitions_(): void {
    switch (this._state) {
      case InternalTaskState.PAUSING:
        this._transition(InternalTaskState.PAUSED);
        break;
      case InternalTaskState.CANCELING:
        this._transition(InternalTaskState.CANCELED);
        break;
      case InternalTaskState.RUNNING:
        this._start();
        break;
      default:
        break;
    }
  }

  /**
   * A snapshot of the current task state.
   */
  get snapshot(): UploadTaskSnapshot {
    const externalState = taskStateFromInternalTaskState(this._state);
    return {
      bytesTransferred: this._transferred,
      totalBytes: this._blob.size(),
      state: externalState,
      metadata: this._metadata!,
      task: this,
      ref: this._ref
    };
  }

  /**
   * Adds a callback for an event.
   * @param type - The type of event to listen for.
   * @param nextOrObserver -
   *     The `next` function, which gets called for each item in
   *     the event stream, or an observer object with some or all of these three
   *     properties (`next`, `error`, `complete`).
   * @param error - A function that gets called with a `StorageError`
   *     if the event stream ends due to an error.
   * @param completed - A function that gets called if the
   *     event stream ends normally.
   * @returns
   *     If only the event argument is passed, returns a function you can use to
   *     add callbacks (see the examples above). If more than just the event
   *     argument is passed, returns a function you can call to unregister the
   *     callbacks.
   */
  on(
    type: TaskEvent,
    nextOrObserver?:
      | StorageObserver<UploadTaskSnapshot>
      | null
      | ((snapshot: UploadTaskSnapshot) => unknown),
    error?: ((a: StorageError) => unknown) | null,
    completed?: CompleteFn | null
  ): Unsubscribe | Subscribe<UploadTaskSnapshot> {
    // Note: `type` isn't being used. Its type is also incorrect. TaskEvent should not be a string.
    const observer = new Observer(
      (nextOrObserver as
        | StorageObserverInternal<UploadTaskSnapshot>
        | NextFn<UploadTaskSnapshot>) || undefined,
      error || undefined,
      completed || undefined
    );
    this._addObserver(observer);
    return () => {
      this._removeObserver(observer);
    };
  }

  /**
   * This object behaves like a Promise, and resolves with its snapshot data
   * when the upload completes.
   * @param onFulfilled - The fulfillment callback. Promise chaining works as normal.
   * @param onRejected - The rejection callback.
   */
  then<U>(
    onFulfilled?: ((value: UploadTaskSnapshot) => U | Promise<U>) | null,
    onRejected?: ((error: StorageError) => U | Promise<U>) | null
  ): Promise<U> {
    // These casts are needed so that TypeScript can infer the types of the
    // resulting Promise.
    return this._promise.then<U>(
      onFulfilled as (value: UploadTaskSnapshot) => U | Promise<U>,
      onRejected as ((error: unknown) => Promise<never>) | null
    );
  }

  /**
   * Equivalent to calling `then(null, onRejected)`.
   */
  catch<T>(onRejected: (p1: StorageError) => T | Promise<T>): Promise<T> {
    return this.then(null, onRejected);
  }

  /**
   * Adds the given observer.
   */
  private _addObserver(observer: Observer<UploadTaskSnapshot>): void {
    this._observers.push(observer);
    this._notifyObserver(observer);
  }

  /**
   * Removes the given observer.
   */
  private _removeObserver(observer: Observer<UploadTaskSnapshot>): void {
    const i = this._observers.indexOf(observer);
    if (i !== -1) {
      this._observers.splice(i, 1);
    }
  }

  private _notifyObservers(): void {
    this._finishPromise();
    const observers = this._observers.slice();
    observers.forEach(observer => {
      this._notifyObserver(observer);
    });
  }

  private _finishPromise(): void {
    if (this._resolve !== undefined) {
      let triggered = true;
      switch (taskStateFromInternalTaskState(this._state)) {
        case TaskState.SUCCESS:
          fbsAsync(this._resolve.bind(null, this.snapshot))();
          break;
        case TaskState.CANCELED:
        case TaskState.ERROR:
          const toCall = this._reject as (p1: StorageError) => void;
          fbsAsync(toCall.bind(null, this._error as StorageError))();
          break;
        default:
          triggered = false;
          break;
      }
      if (triggered) {
        this._resolve = undefined;
        this._reject = undefined;
      }
    }
  }

  private _notifyObserver(observer: Observer<UploadTaskSnapshot>): void {
    const externalState = taskStateFromInternalTaskState(this._state);
    switch (externalState) {
      case TaskState.RUNNING:
      case TaskState.PAUSED:
        if (observer.next) {
          fbsAsync(observer.next.bind(observer, this.snapshot))();
        }
        break;
      case TaskState.SUCCESS:
        if (observer.complete) {
          fbsAsync(observer.complete.bind(observer))();
        }
        break;
      case TaskState.CANCELED:
      case TaskState.ERROR:
        if (observer.error) {
          fbsAsync(
            observer.error.bind(observer, this._error as StorageError)
          )();
        }
        break;
      default:
        // TODO(andysoto): assert(false);
        if (observer.error) {
          fbsAsync(
            observer.error.bind(observer, this._error as StorageError)
          )();
        }
    }
  }

  /**
   * Resumes a paused task. Has no effect on a currently running or failed task.
   * @returns True if the operation took effect, false if ignored.
   */
  resume(): boolean {
    const valid =
      this._state === InternalTaskState.PAUSED ||
      this._state === InternalTaskState.PAUSING;
    if (valid) {
      this._transition(InternalTaskState.RUNNING);
    }
    return valid;
  }

  /**
   * Pauses a currently running task. Has no effect on a paused or failed task.
   * @returns True if the operation took effect, false if ignored.
   */
  pause(): boolean {
    const valid = this._state === InternalTaskState.RUNNING;
    if (valid) {
      this._transition(InternalTaskState.PAUSING);
    }
    return valid;
  }

  /**
   * Cancels a currently running or paused task. Has no effect on a complete or
   * failed task.
   * @returns True if the operation took effect, false if ignored.
   */
  cancel(): boolean {
    const valid =
      this._state === InternalTaskState.RUNNING ||
      this._state === InternalTaskState.PAUSING;
    if (valid) {
      this._transition(InternalTaskState.CANCELING);
    }
    return valid;
  }
}

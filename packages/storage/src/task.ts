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
import { FirebaseStorageError, Code, canceled } from './implementation/error';
import {
  InternalTaskState,
  TaskEvent,
  TaskState,
  taskStateFromInternalTaskState
} from './implementation/taskenums';
import { Metadata } from './metadata';
import {
  CompleteFn,
  ErrorFn,
  NextFn,
  Observer,
  StorageObserver,
  Subscribe,
  Unsubscribe
} from './implementation/observer';
import { Request } from './implementation/request';
import { UploadTaskSnapshot } from './tasksnapshot';
import {
  ArgSpec,
  nullFunctionSpec,
  looseObjectSpec,
  stringSpec,
  validate
} from './implementation/args';
import { async as fbsAsync } from './implementation/async';
import { Location } from './implementation/location';
import * as fbsMetadata from './implementation/metadata';
import * as fbsRequests from './implementation/requests';
import * as typeUtils from './implementation/type';
import { Reference } from './reference';
import { StorageService } from './service';

/**
 * Represents a blob being uploaded. Can be used to pause/resume/cancel the
 * upload and manage callbacks for various events.
 */
export class UploadTask {
  private ref_: Reference;
  private service_: StorageService;
  private location_: Location;
  private blob_: FbsBlob;
  private metadata_: Metadata | null;
  private mappings_: fbsMetadata.Mappings;
  private transferred_: number = 0;
  private needToFetchStatus_: boolean = false;
  private needToFetchMetadata_: boolean = false;
  private observers_: Array<Observer<UploadTaskSnapshot>> = [];
  private resumable_: boolean;
  private state_: InternalTaskState;
  private error_: Error | null = null;
  private uploadUrl_: string | null = null;
  private request_: Request<unknown> | null = null;
  private chunkMultiplier_: number = 1;
  private errorHandler_: (p1: FirebaseStorageError) => void;
  private metadataErrorHandler_: (p1: FirebaseStorageError) => void;
  private resolve_: ((p1: UploadTaskSnapshot) => void) | null = null;
  private reject_: ((p1: Error) => void) | null = null;
  private promise_: Promise<UploadTaskSnapshot>;

  /**
   * @param ref The firebaseStorage.Reference object this task came
   *     from, untyped to avoid cyclic dependencies.
   * @param blob The blob to upload.
   */
  constructor(
    ref: Reference,
    service: StorageService,
    location: Location,
    mappings: fbsMetadata.Mappings,
    blob: FbsBlob,
    metadata: Metadata | null = null
  ) {
    this.ref_ = ref;
    this.service_ = service;
    this.location_ = location;
    this.blob_ = blob;
    this.metadata_ = metadata;
    this.mappings_ = mappings;
    this.resumable_ = this.shouldDoResumable_(this.blob_);
    this.state_ = InternalTaskState.RUNNING;
    this.errorHandler_ = error => {
      this.request_ = null;
      this.chunkMultiplier_ = 1;
      if (error.codeEquals(Code.CANCELED)) {
        this.needToFetchStatus_ = true;
        this.completeTransitions_();
      } else {
        this.error_ = error;
        this.transition_(InternalTaskState.ERROR);
      }
    };
    this.metadataErrorHandler_ = error => {
      this.request_ = null;
      if (error.codeEquals(Code.CANCELED)) {
        this.completeTransitions_();
      } else {
        this.error_ = error;
        this.transition_(InternalTaskState.ERROR);
      }
    };
    this.promise_ = new Promise((resolve, reject) => {
      this.resolve_ = resolve;
      this.reject_ = reject;
      this.start_();
    });

    // Prevent uncaught rejections on the internal promise from bubbling out
    // to the top level with a dummy handler.
    this.promise_.then(null, () => {});
  }

  private makeProgressCallback_(): (p1: number, p2: number) => void {
    const sizeBefore = this.transferred_;
    return loaded => this.updateProgress_(sizeBefore + loaded);
  }

  private shouldDoResumable_(blob: FbsBlob): boolean {
    return blob.size() > 256 * 1024;
  }

  private start_(): void {
    if (this.state_ !== InternalTaskState.RUNNING) {
      // This can happen if someone pauses us in a resume callback, for example.
      return;
    }
    if (this.request_ !== null) {
      return;
    }
    if (this.resumable_) {
      if (this.uploadUrl_ === null) {
        this.createResumable_();
      } else {
        if (this.needToFetchStatus_) {
          this.fetchStatus_();
        } else {
          if (this.needToFetchMetadata_) {
            // Happens if we miss the metadata on upload completion.
            this.fetchMetadata_();
          } else {
            this.continueUpload_();
          }
        }
      }
    } else {
      this.oneShotUpload_();
    }
  }

  private resolveToken_(callback: (p1: string | null) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.service_.getAuthToken().then(authToken => {
      switch (this.state_) {
        case InternalTaskState.RUNNING:
          callback(authToken);
          break;
        case InternalTaskState.CANCELING:
          this.transition_(InternalTaskState.CANCELED);
          break;
        case InternalTaskState.PAUSING:
          this.transition_(InternalTaskState.PAUSED);
          break;
        default:
      }
    });
  }

  // TODO(andysoto): assert false

  private createResumable_(): void {
    this.resolveToken_(authToken => {
      const requestInfo = fbsRequests.createResumableUpload(
        this.service_,
        this.location_,
        this.mappings_,
        this.blob_,
        this.metadata_
      );
      const createRequest = this.service_.makeRequest(requestInfo, authToken);
      this.request_ = createRequest;
      createRequest.getPromise().then((url: string) => {
        this.request_ = null;
        this.uploadUrl_ = url;
        this.needToFetchStatus_ = false;
        this.completeTransitions_();
      }, this.errorHandler_);
    });
  }

  private fetchStatus_(): void {
    // TODO(andysoto): assert(this.uploadUrl_ !== null);
    const url = this.uploadUrl_ as string;
    this.resolveToken_(authToken => {
      const requestInfo = fbsRequests.getResumableUploadStatus(
        this.service_,
        this.location_,
        url,
        this.blob_
      );
      const statusRequest = this.service_.makeRequest(requestInfo, authToken);
      this.request_ = statusRequest;
      statusRequest.getPromise().then(status => {
        status = status as fbsRequests.ResumableUploadStatus;
        this.request_ = null;
        this.updateProgress_(status.current);
        this.needToFetchStatus_ = false;
        if (status.finalized) {
          this.needToFetchMetadata_ = true;
        }
        this.completeTransitions_();
      }, this.errorHandler_);
    });
  }

  private continueUpload_(): void {
    const chunkSize =
      fbsRequests.resumableUploadChunkSize * this.chunkMultiplier_;
    const status = new fbsRequests.ResumableUploadStatus(
      this.transferred_,
      this.blob_.size()
    );

    // TODO(andysoto): assert(this.uploadUrl_ !== null);
    const url = this.uploadUrl_ as string;
    this.resolveToken_(authToken => {
      let requestInfo;
      try {
        requestInfo = fbsRequests.continueResumableUpload(
          this.location_,
          this.service_,
          url,
          this.blob_,
          chunkSize,
          this.mappings_,
          status,
          this.makeProgressCallback_()
        );
      } catch (e) {
        this.error_ = e;
        this.transition_(InternalTaskState.ERROR);
        return;
      }
      const uploadRequest = this.service_.makeRequest(requestInfo, authToken);
      this.request_ = uploadRequest;
      uploadRequest
        .getPromise()
        .then((newStatus: fbsRequests.ResumableUploadStatus) => {
          this.increaseMultiplier_();
          this.request_ = null;
          this.updateProgress_(newStatus.current);
          if (newStatus.finalized) {
            this.metadata_ = newStatus.metadata;
            this.transition_(InternalTaskState.SUCCESS);
          } else {
            this.completeTransitions_();
          }
        }, this.errorHandler_);
    });
  }

  private increaseMultiplier_(): void {
    const currentSize =
      fbsRequests.resumableUploadChunkSize * this.chunkMultiplier_;

    // Max chunk size is 32M.
    if (currentSize < 32 * 1024 * 1024) {
      this.chunkMultiplier_ *= 2;
    }
  }

  private fetchMetadata_(): void {
    this.resolveToken_(authToken => {
      const requestInfo = fbsRequests.getMetadata(
        this.service_,
        this.location_,
        this.mappings_
      );
      const metadataRequest = this.service_.makeRequest(requestInfo, authToken);
      this.request_ = metadataRequest;
      metadataRequest.getPromise().then(metadata => {
        this.request_ = null;
        this.metadata_ = metadata;
        this.transition_(InternalTaskState.SUCCESS);
      }, this.metadataErrorHandler_);
    });
  }

  private oneShotUpload_(): void {
    this.resolveToken_(authToken => {
      const requestInfo = fbsRequests.multipartUpload(
        this.service_,
        this.location_,
        this.mappings_,
        this.blob_,
        this.metadata_
      );
      const multipartRequest = this.service_.makeRequest(
        requestInfo,
        authToken
      );
      this.request_ = multipartRequest;
      multipartRequest.getPromise().then(metadata => {
        this.request_ = null;
        this.metadata_ = metadata;
        this.updateProgress_(this.blob_.size());
        this.transition_(InternalTaskState.SUCCESS);
      }, this.errorHandler_);
    });
  }

  private updateProgress_(transferred: number): void {
    const old = this.transferred_;
    this.transferred_ = transferred;

    // A progress update can make the "transferred" value smaller (e.g. a
    // partial upload not completed by server, after which the "transferred"
    // value may reset to the value at the beginning of the request).
    if (this.transferred_ !== old) {
      this.notifyObservers_();
    }
  }

  private transition_(state: InternalTaskState): void {
    if (this.state_ === state) {
      return;
    }
    switch (state) {
      case InternalTaskState.CANCELING:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING ||
        //        this.state_ === InternalTaskState.PAUSING);
        this.state_ = state;
        if (this.request_ !== null) {
          this.request_.cancel();
        }
        break;
      case InternalTaskState.PAUSING:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING);
        this.state_ = state;
        if (this.request_ !== null) {
          this.request_.cancel();
        }
        break;
      case InternalTaskState.RUNNING:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.PAUSED ||
        //        this.state_ === InternalTaskState.PAUSING);
        const wasPaused = this.state_ === InternalTaskState.PAUSED;
        this.state_ = state;
        if (wasPaused) {
          this.notifyObservers_();
          this.start_();
        }
        break;
      case InternalTaskState.PAUSED:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.PAUSING);
        this.state_ = state;
        this.notifyObservers_();
        break;
      case InternalTaskState.CANCELED:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.PAUSED ||
        //        this.state_ === InternalTaskState.CANCELING);
        this.error_ = canceled();
        this.state_ = state;
        this.notifyObservers_();
        break;
      case InternalTaskState.ERROR:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING ||
        //        this.state_ === InternalTaskState.PAUSING ||
        //        this.state_ === InternalTaskState.CANCELING);
        this.state_ = state;
        this.notifyObservers_();
        break;
      case InternalTaskState.SUCCESS:
        // TODO(andysoto):
        // assert(this.state_ === InternalTaskState.RUNNING ||
        //        this.state_ === InternalTaskState.PAUSING ||
        //        this.state_ === InternalTaskState.CANCELING);
        this.state_ = state;
        this.notifyObservers_();
        break;
      default: // Ignore
    }
  }

  private completeTransitions_(): void {
    switch (this.state_) {
      case InternalTaskState.PAUSING:
        this.transition_(InternalTaskState.PAUSED);
        break;
      case InternalTaskState.CANCELING:
        this.transition_(InternalTaskState.CANCELED);
        break;
      case InternalTaskState.RUNNING:
        this.start_();
        break;
      default:
        // TODO(andysoto): assert(false);
        break;
    }
  }

  get snapshot(): UploadTaskSnapshot {
    const externalState = taskStateFromInternalTaskState(this.state_);
    return new UploadTaskSnapshot(
      this.transferred_,
      this.blob_.size(),
      externalState,
      this.metadata_,
      this,
      this.ref_
    );
  }

  /**
   * Adds a callback for an event.
   * @param type The type of event to listen for.
   */
  on(
    type: TaskEvent,
    nextOrObserver?:
      | NextFn<UploadTaskSnapshot>
      | StorageObserver<UploadTaskSnapshot>
      | null,
    error?: ErrorFn | null,
    completed?: CompleteFn | null
  ): Unsubscribe | Subscribe<UploadTaskSnapshot> {
    function typeValidator(): void {
      if (type !== TaskEvent.STATE_CHANGED) {
        throw `Expected one of the event types: [${TaskEvent.STATE_CHANGED}].`;
      }
    }
    const nextOrObserverMessage =
      'Expected a function or an Object with one of ' +
      '`next`, `error`, `complete` properties.';
    const nextValidator = nullFunctionSpec(true).validator;
    const observerValidator = looseObjectSpec(null, true).validator;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function nextOrObserverValidator(p: any): void {
      try {
        nextValidator(p);
        return;
      } catch (e) {}
      try {
        observerValidator(p);
        const anyDefined =
          typeUtils.isJustDef(p['next']) ||
          typeUtils.isJustDef(p['error']) ||
          typeUtils.isJustDef(p['complete']);
        if (!anyDefined) {
          throw '';
        }
        return;
      } catch (e) {
        throw nextOrObserverMessage;
      }
    }
    const specs = [
      stringSpec(typeValidator),
      looseObjectSpec(nextOrObserverValidator, true),
      nullFunctionSpec(true),
      nullFunctionSpec(true)
    ];
    validate('on', specs, arguments);
    const self = this;

    function makeBinder(
      specs: ArgSpec[] | null
    ): Subscribe<UploadTaskSnapshot> {
      function binder(
        nextOrObserver?:
          | NextFn<UploadTaskSnapshot>
          | StorageObserver<UploadTaskSnapshot>
          | null,
        error?: ErrorFn | null,
        complete?: CompleteFn | null
      ): () => void {
        if (specs !== null) {
          validate('on', specs, arguments);
        }
        const observer = new Observer(nextOrObserver, error, completed);
        self.addObserver_(observer);
        return () => {
          self.removeObserver_(observer);
        };
      }
      return binder;
    }

    function binderNextOrObserverValidator(p: unknown): void {
      if (p === null) {
        throw nextOrObserverMessage;
      }
      nextOrObserverValidator(p);
    }
    const binderSpecs = [
      looseObjectSpec(binderNextOrObserverValidator),
      nullFunctionSpec(true),
      nullFunctionSpec(true)
    ];
    const typeOnly = !(
      typeUtils.isJustDef(nextOrObserver) ||
      typeUtils.isJustDef(error) ||
      typeUtils.isJustDef(completed)
    );
    if (typeOnly) {
      return makeBinder(binderSpecs);
    } else {
      return makeBinder(null)(nextOrObserver, error, completed);
    }
  }

  /**
   * This object behaves like a Promise, and resolves with its snapshot data
   * when the upload completes.
   * @param onFulfilled The fulfillment callback. Promise chaining works as normal.
   * @param onRejected The rejection callback.
   */
  then<U>(
    onFulfilled?: ((value: UploadTaskSnapshot) => U | Promise<U>) | null,
    onRejected?: ((error: Error) => U | Promise<U>) | null
  ): Promise<U> {
    // These casts are needed so that TypeScript can infer the types of the
    // resulting Promise.
    return this.promise_.then<U>(
      onFulfilled as (value: UploadTaskSnapshot) => U | Promise<U>,
      onRejected as ((error: unknown) => Promise<never>) | null
    );
  }

  /**
   * Equivalent to calling `then(null, onRejected)`.
   */
  catch<T>(onRejected: (p1: Error) => T | Promise<T>): Promise<T> {
    return this.then(null, onRejected);
  }

  /**
   * Adds the given observer.
   */
  private addObserver_(observer: Observer<UploadTaskSnapshot>): void {
    this.observers_.push(observer);
    this.notifyObserver_(observer);
  }

  /**
   * Removes the given observer.
   */
  private removeObserver_(observer: Observer<UploadTaskSnapshot>): void {
    const i = this.observers_.indexOf(observer);
    if (i !== -1) {
      this.observers_.splice(i, 1);
    }
  }

  private notifyObservers_(): void {
    this.finishPromise_();
    const observers = this.observers_.slice();
    observers.forEach(observer => {
      this.notifyObserver_(observer);
    });
  }

  private finishPromise_(): void {
    if (this.resolve_ !== null) {
      let triggered = true;
      switch (taskStateFromInternalTaskState(this.state_)) {
        case TaskState.SUCCESS:
          fbsAsync(this.resolve_.bind(null, this.snapshot))();
          break;
        case TaskState.CANCELED:
        case TaskState.ERROR:
          const toCall = this.reject_ as (p1: Error) => void;
          fbsAsync(toCall.bind(null, this.error_ as Error))();
          break;
        default:
          triggered = false;
          break;
      }
      if (triggered) {
        this.resolve_ = null;
        this.reject_ = null;
      }
    }
  }

  private notifyObserver_(observer: Observer<UploadTaskSnapshot>): void {
    const externalState = taskStateFromInternalTaskState(this.state_);
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
          fbsAsync(observer.error.bind(observer, this.error_ as Error))();
        }
        break;
      default:
        // TODO(andysoto): assert(false);
        if (observer.error) {
          fbsAsync(observer.error.bind(observer, this.error_ as Error))();
        }
    }
  }

  /**
   * Resumes a paused task. Has no effect on a currently running or failed task.
   * @return True if the operation took effect, false if ignored.
   */
  resume(): boolean {
    validate('resume', [], arguments);
    const valid =
      this.state_ === InternalTaskState.PAUSED ||
      this.state_ === InternalTaskState.PAUSING;
    if (valid) {
      this.transition_(InternalTaskState.RUNNING);
    }
    return valid;
  }

  /**
   * Pauses a currently running task. Has no effect on a paused or failed task.
   * @return True if the operation took effect, false if ignored.
   */
  pause(): boolean {
    validate('pause', [], arguments);
    const valid = this.state_ === InternalTaskState.RUNNING;
    if (valid) {
      this.transition_(InternalTaskState.PAUSING);
    }
    return valid;
  }

  /**
   * Cancels a currently running or paused task. Has no effect on a complete or
   * failed task.
   * @return True if the operation took effect, false if ignored.
   */
  cancel(): boolean {
    validate('cancel', [], arguments);
    const valid =
      this.state_ === InternalTaskState.RUNNING ||
      this.state_ === InternalTaskState.PAUSING;
    if (valid) {
      this.transition_(InternalTaskState.CANCELING);
    }
    return valid;
  }
}

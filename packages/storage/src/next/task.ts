import { FbsBlob } from '../implementation/blob';
import {
  InternalTaskState,
  TaskState,
  taskStateFromInternalTaskState
} from '../implementation/taskenums';
import { Metadata } from '../metadata';
import {
  Observer
} from '../implementation/observer';
import { Request } from '../implementation/request';
import { Mappings } from '../implementation/metadata';
import { async } from '@firebase/util';
import { multipartUpload, createResumableUpload, getResumableUploadStatus, getMetadata, continueResumableUpload } from './requests';
import { ReferenceImplNext } from './reference';
import { StorageImplNext } from './storage';
import { makeRequest } from './client';
import { ReferenceNext } from '@firebase/storage-types/next';
import { FirebaseStorageError, canceled } from '../implementation/error';
import { getAuthToken } from './auth';
import { resumableUploadChunkSize, ResumableUploadStatus } from '../implementation/requests';

/**
 * Represents a blob being uploaded. Can be used to pause/resume/cancel the
 * upload and manage callbacks for various events.
 */
export class UploadTask {
  private resumable_: boolean;
  private state_: InternalTaskState;
  private storage: StorageImplNext;
  private request_: Request<unknown> | null = null;
  private transferred_: number = 0;
  private observers_: Array<Observer<UploadTaskSnapshot>> = [];
  private error_: Error | null = null;
  private uploadUrl_: string | null = null; // ??
  private needToFetchStatus_: boolean = false; // ??
  private needToFetchMetadata_: boolean = false;
  private chunkMultiplier_: number = 1;

  private errorHandler_: (p1: FirebaseStorageError) => void = error => {
    // TODO
  };
  private metadataErrorHandler_: (p1: FirebaseStorageError) => void = error => {
    // TODO
  };
  /**
   * @param ref The firebaseStorage.Reference object this task came
   *     from, untyped to avoid cyclic dependencies.
   * @param blob The blob to upload.
   */
  constructor(
    private ref: ReferenceImplNext,
    private mappings: Mappings,
    private blob: FbsBlob,
    private metadata: Metadata | null = null
  ) {
    this.storage = ref.storage as StorageImplNext;

    this.resumable_ = this.shouldDoResumable(blob);
    this.state_ = InternalTaskState.RUNNING;
    this.start_();
  }

  private shouldDoResumable(blob: FbsBlob): boolean {
    return blob.size() > 256 * 1024;
  }

  private start_(): void {
    if (this.state_ !== InternalTaskState.RUNNING) {
      // This can happen if someone pauses us in a resume callback, for example.
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


  private async continueUpload_(): Promise<void> {
    const chunkSize =
      resumableUploadChunkSize * this.chunkMultiplier_;
    const status = new ResumableUploadStatus(
      this.transferred_,
      this.blob.size()
    );

    // TODO(andysoto): assert(this.uploadUrl_ !== null);
    const url = this.uploadUrl_ as string;
    const authToken = await getAuthToken(this.storage);
    let requestInfo;
    try {
      requestInfo = continueResumableUpload(
        this.ref,
        url,
        this.blob,
        chunkSize,
        this.mappings,
        status,
        loaded => this.updateProgress_(this.transferred_ + loaded)
      );
    } catch (e) {
      this.error_ = e;
      this.transition_(InternalTaskState.ERROR);
      return;
    }

    const uploadRequest = makeRequest(
      this.storage,
      requestInfo,
      authToken
    );

    this.request_ = uploadRequest;
    try {
      const newStatus = await uploadRequest.getPromise();

      this.increaseMultiplier_();
      this.request_ = null;
      this.updateProgress_(newStatus.current);
      if (newStatus.finalized) {
        this.metadata = newStatus.metadata;
        this.transition_(InternalTaskState.SUCCESS);
      } else {
        this.completeTransitions_();
      }
    } catch (e) {
      this.errorHandler_(e);
    }
  }

  private increaseMultiplier_(): void {
    const currentSize =
      resumableUploadChunkSize * this.chunkMultiplier_;

    // Max chunk size is 32M.
    if (currentSize < 32 * 1024 * 1024) {
      this.chunkMultiplier_ *= 2;
    }
  }

  private async createResumable_(): Promise<void> {
    const authToken = await getAuthToken(this.storage);
    const requestInfo = createResumableUpload(
      this.ref,
      this.mappings,
      this.blob,
      this.metadata
    );

    const createRequest = makeRequest(
      this.storage,
      requestInfo,
      authToken
    );

    this.request_ = createRequest;

    try {
      const url = await createRequest.getPromise();
      this.request_ = null;
      this.uploadUrl_ = url;
      this.needToFetchStatus_ = false;
      this.completeTransitions_();
    } catch (e) {
      this.errorHandler_(e)
    }
  }

  private async fetchStatus_(): Promise<void> {
    // TODO(andysoto): assert(this.uploadUrl_ !== null);
    const url = this.uploadUrl_ as string;
    const authToken = await getAuthToken(this.storage);

    const requestInfo = getResumableUploadStatus(
      this.ref,
      url,
      this.blob
    );
    const statusRequest = makeRequest(
      this.storage,
      requestInfo,
      authToken
    );
    this.request_ = statusRequest;

    try {
      const status = await statusRequest.getPromise();
      this.request_ = null;
      this.updateProgress_(status.current);
      this.needToFetchStatus_ = false;
      if (status.finalized) {
        this.needToFetchMetadata_ = true;
      }
      this.completeTransitions_();
    } catch (e) {
      this.errorHandler_(e);
    }

  }

  private async fetchMetadata_(): Promise<void> {
    const authToken = await getAuthToken(this.storage);
    const requestInfo = getMetadata(
      this.ref,
      this.mappings
    );
    const metadataRequest = makeRequest(
      this.storage,
      requestInfo,
      authToken
    );
    this.request_ = metadataRequest;

    try {
      const metadata = await metadataRequest.getPromise()
      this.request_ = null;
      this.metadata = metadata;
      this.transition_(InternalTaskState.SUCCESS);
    } catch (e) {
      this.metadataErrorHandler_(e);
    }
  }

  private async oneShotUpload_(): Promise<void> {
    const authToken = await getAuthToken(this.storage);

    const requestInfo = multipartUpload(
      this.ref,
      this.mappings,
      this.blob,
      this.metadata
    );

    const multipartRequest = makeRequest(
      this.storage,
      requestInfo,
      authToken
    );

    this.request_ = multipartRequest;

    try {
      const metadata = await multipartRequest.getPromise();
      this.request_ = null;
      this.metadata = metadata;
      this.updateProgress_(this.blob.size());
      this.transition_(InternalTaskState.SUCCESS);
    } catch (e) {
      this.errorHandler_(e)
    }
  };

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

  private notifyObservers_(): void {
    // this.finishPromise_();
    const observers = this.observers_.slice();
    observers.forEach(observer => {
      this.notifyObserver_(observer);
    });
  }

  private notifyObserver_(observer: Observer<UploadTaskSnapshot>): void {
    const externalState = taskStateFromInternalTaskState(this.state_);
    switch (externalState) {
      case TaskState.RUNNING:
      case TaskState.PAUSED:
        if (observer.next) {
          async(observer.next.bind(observer, this.snapshot))();
        }
        break;
      case TaskState.SUCCESS:
        if (observer.complete) {
          async(observer.complete.bind(observer))();
        }
        break;
      case TaskState.CANCELED:
      case TaskState.ERROR:
        if (observer.error) {
          async(observer.error.bind(observer, this.error_ as Error))();
        }
        break;
      default:
        // TODO(andysoto): assert(false);
        if (observer.error) {
          async(observer.error.bind(observer, this.error_ as Error))();
        }
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

  get snapshot(): UploadTaskSnapshot {
    const externalState = taskStateFromInternalTaskState(this.state_);
    return {
      bytesTransferred: this.transferred_,
      totalBytes: this.blob.size(),
      state: externalState,
      metadata: this.metadata,
      task: this,
      ref: this.ref
    };
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

  /**
   * Adds a callback for an event.
   * @param type The type of event to listen for.
   */
  // on(
  //   type: TaskEvent,
  //   nextOrObserver?:
  //     | NextFn<UploadTaskSnapshot>
  //     | StorageObserver<UploadTaskSnapshot>
  //     | null,
  //   error?: ErrorFn | null,
  //   completed?: CompleteFn | null
  // ): Unsubscribe | Subscribe<UploadTaskSnapshot> {
  //   function typeValidator(): void {
  //     if (type !== TaskEvent.STATE_CHANGED) {
  //       throw `Expected one of the event types: [${TaskEvent.STATE_CHANGED}].`;
  //     }
  //   }
  //   const nextOrObserverMessage =
  //     'Expected a function or an Object with one of ' +
  //     '`next`, `error`, `complete` properties.';
  //   const nextValidator = nullFunctionSpec(true).validator;
  //   const observerValidator = looseObjectSpec(null, true).validator;

  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   function nextOrObserverValidator(p: any): void {
  //     try {
  //       nextValidator(p);
  //       return;
  //     } catch (e) { }
  //     try {
  //       observerValidator(p);
  //       const anyDefined =
  //         typeUtils.isJustDef(p['next']) ||
  //         typeUtils.isJustDef(p['error']) ||
  //         typeUtils.isJustDef(p['complete']);
  //       if (!anyDefined) {
  //         throw '';
  //       }
  //       return;
  //     } catch (e) {
  //       throw nextOrObserverMessage;
  //     }
  //   }
  //   const specs = [
  //     stringSpec(typeValidator),
  //     looseObjectSpec(nextOrObserverValidator, true),
  //     nullFunctionSpec(true),
  //     nullFunctionSpec(true)
  //   ];
  //   validate('on', specs, arguments);
  //   const self = this;

  //   function makeBinder(
  //     specs: ArgSpec[] | null
  //   ): Subscribe<UploadTaskSnapshot> {
  //     function binder(
  //       nextOrObserver?:
  //         | NextFn<UploadTaskSnapshot>
  //         | StorageObserver<UploadTaskSnapshot>
  //         | null,
  //       error?: ErrorFn | null,
  //       complete?: CompleteFn | null
  //     ): () => void {
  //       if (specs !== null) {
  //         validate('on', specs, arguments);
  //       }
  //       const observer = new Observer(nextOrObserver, error, completed);
  //       self.addObserver_(observer);
  //       return () => {
  //         self.removeObserver_(observer);
  //       };
  //     }
  //     return binder;
  //   }

  //   function binderNextOrObserverValidator(p: unknown): void {
  //     if (p === null) {
  //       throw nextOrObserverMessage;
  //     }
  //     nextOrObserverValidator(p);
  //   }
  //   const binderSpecs = [
  //     looseObjectSpec(binderNextOrObserverValidator),
  //     nullFunctionSpec(true),
  //     nullFunctionSpec(true)
  //   ];
  //   const typeOnly = !(
  //     typeUtils.isJustDef(nextOrObserver) ||
  //     typeUtils.isJustDef(error) ||
  //     typeUtils.isJustDef(completed)
  //   );
  //   if (typeOnly) {
  //     return makeBinder(binderSpecs);
  //   } else {
  //     return makeBinder(null)(nextOrObserver, error, completed);
  //   }
  // }

  /**
   * This object behaves like a Promise, and resolves with its snapshot data
   * when the upload completes.
   * @param onFulfilled The fulfillment callback. Promise chaining works as normal.
   * @param onRejected The rejection callback.
   */
  // then<U>(
  //   onFulfilled?: ((value: UploadTaskSnapshot) => U | Promise<U>) | null,
  //   onRejected?: ((error: Error) => U | Promise<U>) | null
  // ): Promise<U> {

  // }

  /**
   * Equivalent to calling `then(null, onRejected)`.
   */
  // catch<T>(onRejected: (p1: Error) => T | Promise<T>): Promise<T> {

  // }

  /**
   * Resumes a paused task. Has no effect on a currently running or failed task.
   * @return True if the operation took effect, false if ignored.
   */
  // resume(): boolean {

  // }

  /**
   * Pauses a currently running task. Has no effect on a paused or failed task.
   * @return True if the operation took effect, false if ignored.
   */
  // pause(): boolean {

  // }

  /**
   * Cancels a currently running or paused task. Has no effect on a complete or
   * failed task.
   * @return True if the operation took effect, false if ignored.
   */
  // cancel(): boolean {
  // }
}

export interface UploadTaskSnapshot {
  readonly bytesTransferred: number,
  readonly totalBytes: number,
  readonly state: TaskState,
  readonly metadata: Metadata | null,
  readonly task: UploadTask,
  readonly ref: ReferenceNext
}

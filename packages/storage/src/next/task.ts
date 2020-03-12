import { FbsBlob } from '../implementation/blob';
import {
  InternalTaskState,
  TaskEvent,
  TaskState,
  taskStateFromInternalTaskState
} from '../implementation/taskenums';
import { Metadata } from '../metadata';
import {
  CompleteFn,
  ErrorFn,
  NextFn,
  Observer,
  StorageObserver,
  Subscribe,
  Unsubscribe
} from '../implementation/observer';
import { Request } from '../implementation/request';
import {
  ArgSpec,
  nullFunctionSpec,
  looseObjectSpec,
  stringSpec,
  validate
} from '../implementation/args';
import { Mappings } from '../implementation/metadata';
import { Deferred, async } from '@firebase/util';
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';
import { multipartUpload } from './requests';
import { ReferenceImplNext } from './reference';
import { StorageImplNext } from './storage';
import { makeRequest } from './client';
import { ReferenceNext } from '@firebase/storage-types/next';
import { FirebaseStorageError, canceled } from '../implementation/error';

/**
 * Represents a blob being uploaded. Can be used to pause/resume/cancel the
 * upload and manage callbacks for various events.
 */
export class UploadTask {
  private resumable_: boolean;
  private state_: InternalTaskState;
  private deferred: Deferred<unknown>;
  private auth: FirebaseAuthInternal | null;
  private authToken: string | null = null;
  private storage: StorageImplNext;
  private request_: Request<unknown> | null = null;
  private transferred_: number = 0;
  private observers_: Array<Observer<UploadTaskSnapshot>> = [];
  private error_: Error | null = null;

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
    this.auth = this.storage._authProvider.getImmediate({
      optional: true
    });

    this.resumable_ = this.shouldDoResumable(blob);
    this.state_ = InternalTaskState.RUNNING;
    this.deferred = new Deferred();
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

    this.oneShotUpload_();
  }

  private async oneShotUpload_(): Promise<void> {
    const authToken = await this.resolveToken_();

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
    multipartRequest.getPromise().then(metadata => {
      this.request_ = null;
      this.metadata = metadata;
      this.updateProgress_(this.blob.size());
      this.transition_(InternalTaskState.SUCCESS);
    }, this.errorHandler_);
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

  private async resolveToken_(): Promise<string | null> {
    let authToken = null;
    if (this.auth) {
      const token = await this.auth.getToken();
      if (token) {
        authToken = token.accessToken;
      }
    }
    return authToken;
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

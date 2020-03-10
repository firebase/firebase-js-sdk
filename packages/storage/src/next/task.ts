import { AuthWrapper } from '../implementation/authwrapper';
import { FbsBlob } from '../implementation/blob';
import { FirebaseStorageError, Code, canceled } from '../implementation/error';
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
import { UploadTaskSnapshot } from '../tasksnapshot';
import {
  ArgSpec,
  nullFunctionSpec,
  looseObjectSpec,
  stringSpec,
  validate
} from '../implementation/args';
import { Location } from '../implementation/location';
import { ReferenceNext } from '@firebase/storage-types/next';
import { Mappings } from '../implementation/metadata';
import { Deferred } from '@firebase/util';
import { StorageInternalNext } from './types';
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';
import { multipartUpload } from './requests';

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
  /**
   * @param ref The firebaseStorage.Reference object this task came
   *     from, untyped to avoid cyclic dependencies.
   * @param blob The blob to upload.
   */
  constructor(
    ref: ReferenceNext,
    mappings: Mappings,
    blob: FbsBlob,
    metadata: Metadata | null = null
  ) {
    this.auth = (ref.storage as StorageInternalNext).authProvider.getImmediate({
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
      this.location_,
      this.mappings_,
      this.blob_,
      this.metadata_
    );
    const multipartRequest = this.authWrapper_.makeRequest(
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

  }

  /**
   * Equivalent to calling `then(null, onRejected)`.
   */
  catch<T>(onRejected: (p1: Error) => T | Promise<T>): Promise<T> {

  }

  /**
   * Resumes a paused task. Has no effect on a currently running or failed task.
   * @return True if the operation took effect, false if ignored.
   */
  resume(): boolean {

  }

  /**
   * Pauses a currently running task. Has no effect on a paused or failed task.
   * @return True if the operation took effect, false if ignored.
   */
  pause(): boolean {

  }

  /**
   * Cancels a currently running or paused task. Has no effect on a complete or
   * failed task.
   * @return True if the operation took effect, false if ignored.
   */
  cancel(): boolean {
  }
}

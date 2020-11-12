/**
 * @license
 * Copyright 2020 Google LLC
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

import { Deferred } from '../util/promise';
import { PartialObserver } from './observer';
import { debugAssert } from '../util/assert';
import { FirestoreError } from '../util/error';

export interface ApiLoadBundleTask {
  onProgress(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next?: (progress: ApiLoadBundleTaskProgress) => any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?: (error: Error) => any,
    complete?: () => void
  ): void;

  then<T, R>(
    onFulfilled?: (a: ApiLoadBundleTaskProgress) => T | PromiseLike<T>,
    onRejected?: (a: Error) => R | PromiseLike<R>
  ): Promise<T | R>;

  catch<R>(
    onRejected: (a: Error) => R | PromiseLike<R>
  ): Promise<R | ApiLoadBundleTaskProgress>;
}

export interface ApiLoadBundleTaskProgress {
  documentsLoaded: number;
  totalDocuments: number;
  bytesLoaded: number;
  totalBytes: number;
  taskState: TaskState;
}

export type TaskState = 'Error' | 'Running' | 'Success';

export class LoadBundleTask
  implements ApiLoadBundleTask, PromiseLike<ApiLoadBundleTaskProgress> {
  private _progressObserver: PartialObserver<ApiLoadBundleTaskProgress> = {};
  private _taskCompletionResolver = new Deferred<ApiLoadBundleTaskProgress>();

  private _lastProgress: ApiLoadBundleTaskProgress = {
    taskState: 'Running',
    totalBytes: 0,
    totalDocuments: 0,
    bytesLoaded: 0,
    documentsLoaded: 0
  };

  onProgress(
    next?: (progress: ApiLoadBundleTaskProgress) => unknown,
    error?: (err: Error) => unknown,
    complete?: () => void
  ): void {
    this._progressObserver = {
      next,
      error,
      complete
    };
  }

  catch<R>(
    onRejected: (a: Error) => R | PromiseLike<R>
  ): Promise<R | ApiLoadBundleTaskProgress> {
    return this._taskCompletionResolver.promise.catch(onRejected);
  }

  then<T, R>(
    onFulfilled?: (a: ApiLoadBundleTaskProgress) => T | PromiseLike<T>,
    onRejected?: (a: Error) => R | PromiseLike<R>
  ): Promise<T | R> {
    return this._taskCompletionResolver.promise.then(onFulfilled, onRejected);
  }

  /**
   * Notifies all observers that bundle loading has completed, with a provided
   * `LoadBundleTaskProgress` object.
   */
  _completeWith(progress: ApiLoadBundleTaskProgress): void {
    debugAssert(
      progress.taskState === 'Success',
      'Task is not completed with Success.'
    );
    this._updateProgress(progress);
    if (this._progressObserver.complete) {
      this._progressObserver.complete();
    }

    this._taskCompletionResolver.resolve(progress);
  }

  /**
   * Notifies all observers that bundle loading has failed, with a provided
   * `Error` as the reason.
   */
  _failWith(error: FirestoreError): void {
    this._lastProgress.taskState = 'Error';

    if (this._progressObserver.next) {
      this._progressObserver.next(this._lastProgress);
    }

    if (this._progressObserver.error) {
      this._progressObserver.error(error);
    }

    this._taskCompletionResolver.reject(error);
  }

  /**
   * Notifies a progress update of loading a bundle.
   * @param progress The new progress.
   */
  _updateProgress(progress: ApiLoadBundleTaskProgress): void {
    debugAssert(
      this._lastProgress.taskState === 'Running',
      'Cannot update progress on a completed or failed task'
    );

    this._lastProgress = progress;
    if (this._progressObserver.next) {
      this._progressObserver.next(progress);
    }
  }
}

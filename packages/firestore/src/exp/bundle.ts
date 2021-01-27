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

import { debugAssert } from '../util/assert';
import { FirestoreError } from '../util/error';
import { Deferred } from '../util/promise';
import { PartialObserver } from '../api/observer';

// I moved this filed to match the current pattern where api relies on exp.
// I also added all interfaces here, since we want this file to be the source
// of truth for the generated API (if you run yarn:build it should generate
// a new API report with these changes)

// Add comments
export type TaskState = 'Error' | 'Running' | 'Success';

// Add comments
export interface LoadBundleTaskProgress {
  documentsLoaded: number;
  totalDocuments: number;
  bytesLoaded: number;
  totalBytes: number;
  taskState: TaskState;
}

// Add comments
export class LoadBundleTask implements PromiseLike<LoadBundleTaskProgress> {
  private _progressObserver: PartialObserver<LoadBundleTaskProgress> = {};
  private _taskCompletionResolver = new Deferred<LoadBundleTaskProgress>();

  private _lastProgress: LoadBundleTaskProgress = {
    taskState: 'Running',
    totalBytes: 0,
    totalDocuments: 0,
    bytesLoaded: 0,
    documentsLoaded: 0
  };

  // Add comments
  onProgress(
    next?: (progress: LoadBundleTaskProgress) => unknown,
    error?: (err: Error) => unknown,
    complete?: () => void
  ): void {
    this._progressObserver = {
      next,
      error,
      complete
    };
  }

  // Add comments
  catch<R>(
    onRejected: (a: Error) => R | PromiseLike<R>
  ): Promise<R | LoadBundleTaskProgress> {
    return this._taskCompletionResolver.promise.catch(onRejected);
  }

  // Add comments
  then<T, R>(
    onFulfilled?: (a: LoadBundleTaskProgress) => T | PromiseLike<T>,
    onRejected?: (a: Error) => R | PromiseLike<R>
  ): Promise<T | R> {
    return this._taskCompletionResolver.promise.then(onFulfilled, onRejected);
  }

  /**
   * Notifies all observers that bundle loading has completed, with a provided
   * `LoadBundleTaskProgress` object.
   */
  _completeWith(progress: LoadBundleTaskProgress): void {
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
   * @param progress - The new progress.
   */
  _updateProgress(progress: LoadBundleTaskProgress): void {
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

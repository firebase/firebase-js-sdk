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

import * as firestore from '@firebase/firestore-types';
import { Deferred } from '../util/promise';

export class LoadBundleTask implements firestore.LoadBundleTask {
  private _progressResolver = new Deferred<void>();
  private _userProgressHandler?: (
    progress: firestore.LoadBundleTaskProgress
  ) => unknown;
  private _userProgressErrorHandler?: (err: Error) => unknown;
  private _userProgressCompleteHandler?: () => void;

  private _promiseResolver = new Deferred<firestore.LoadBundleTaskProgress>();

  private _lastProgress: firestore.LoadBundleTaskProgress = {
    taskState: 'Running',
    totalBytes: 0,
    totalDocuments: 0,
    bytesLoaded: 0,
    documentsLoaded: 0
  };

  onProgress(
    next?: (progress: firestore.LoadBundleTaskProgress) => unknown,
    error?: (err: Error) => unknown,
    complete?: () => void
  ): Promise<void> {
    this._userProgressHandler = next;
    this._userProgressErrorHandler = error;
    this._userProgressCompleteHandler = complete;
    return this._progressResolver.promise;
  }

  catch(onRejected: (a: Error) => unknown): Promise<unknown> {
    return this._promiseResolver.promise.catch(onRejected);
  }

  then(
    onFulfilled?: (a: firestore.LoadBundleTaskProgress) => unknown,
    onRejected?: (a: Error) => unknown
  ): Promise<unknown> {
    return this._promiseResolver.promise.then(onFulfilled, onRejected);
  }

  /**
   * Notifies the completion of loading a bundle, with a provided
   * `LoadBundleTaskProgress` object.
   */
  _completeWith(progress: firestore.LoadBundleTaskProgress): void {
    this._updateProgress(progress);
    if (this._userProgressCompleteHandler) {
      this._userProgressCompleteHandler();
    }
    this._progressResolver.resolve();

    this._promiseResolver.resolve(progress);
  }

  /**
   * Notifies a failure of loading a bundle, with a provided `Error`
   * as the reason.
   */
  _failedWith(error: Error): void {
    this._lastProgress.taskState = 'Error';

    if (this._userProgressHandler) {
      this._userProgressHandler(this._lastProgress);
    }

    if (this._userProgressErrorHandler) {
      this._userProgressErrorHandler(error);
    }
    this._progressResolver.reject(error);

    this._promiseResolver.reject(error);
  }

  /**
   * Notifies a progress update of loading a bundle.
   * @param progress The new progress.
   */
  _updateProgress(progress: firestore.LoadBundleTaskProgress): void {
    if (this._lastProgress.taskState === 'Error') {
      return;
    }

    this._lastProgress = progress;
    if (this._userProgressHandler) {
      this._userProgressHandler(progress);
    }
  }
}

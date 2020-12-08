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

import {
  LoadBundleTask as ApiLoadBundleTask,
  LoadBundleTaskProgress
} from '@firebase/firestore-types';
import { Deferred } from '../util/promise';
import { PartialObserver } from './observer';
import { debugAssert } from '../util/assert';
import { FirestoreError } from '../util/error';
import { ensureFirestoreConfigured, Query, Firestore } from './database';
import { Query as ExpQuery } from '../../exp/src/api/reference';
import {
  firestoreClientGetNamedQuery,
  firestoreClientLoadBundle
} from '../core/firestore_client';

export class LoadBundleTask
  implements ApiLoadBundleTask, PromiseLike<LoadBundleTaskProgress> {
  private _progressObserver: PartialObserver<LoadBundleTaskProgress> = {};
  private _taskCompletionResolver = new Deferred<LoadBundleTaskProgress>();

  private _lastProgress: LoadBundleTaskProgress = {
    taskState: 'Running',
    totalBytes: 0,
    totalDocuments: 0,
    bytesLoaded: 0,
    documentsLoaded: 0
  };

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

  catch<R>(
    onRejected: (a: Error) => R | PromiseLike<R>
  ): Promise<R | LoadBundleTaskProgress> {
    return this._taskCompletionResolver.promise.catch(onRejected);
  }

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

export function loadBundle(
  db: Firestore,
  bundleData: ArrayBuffer | ReadableStream<Uint8Array> | string
): LoadBundleTask {
  const resultTask = new LoadBundleTask();
  firestoreClientLoadBundle(
    ensureFirestoreConfigured(db._delegate),
    db._databaseId,
    bundleData,
    resultTask
  );
  return resultTask;
}

export function namedQuery(db: Firestore, name: string): Promise<Query | null> {
  return firestoreClientGetNamedQuery(
    ensureFirestoreConfigured(db._delegate),
    name
  ).then(namedQuery => {
    if (!namedQuery) {
      return null;
    }

    return new Query(db, new ExpQuery(db._delegate, null, namedQuery.query));
  });
}

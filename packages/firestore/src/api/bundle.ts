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
import { PartialObserver } from './observer';
import { debugAssert } from '../util/assert';
import { FirestoreError } from '../util/error';
import { ensureFirestoreConfigured, Query, Firestore } from './database';
import {
  firestoreClientGetNamedQuery,
  firestoreClientLoadBundle
} from '../core/bundle';

export class LoadBundleTask
  implements
    firestore.LoadBundleTask,
    PromiseLike<firestore.LoadBundleTaskProgress> {
  private _progressObserver: PartialObserver<
    firestore.LoadBundleTaskProgress
  > = {};
  private _taskCompletionResolver = new Deferred<
    firestore.LoadBundleTaskProgress
  >();

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
  ): void {
    this._progressObserver = {
      next,
      error,
      complete
    };
  }

  catch<R>(
    onRejected: (a: Error) => R | PromiseLike<R>
  ): Promise<R | firestore.LoadBundleTaskProgress> {
    return this._taskCompletionResolver.promise.catch(onRejected);
  }

  then<T, R>(
    onFulfilled?: (a: firestore.LoadBundleTaskProgress) => T | PromiseLike<T>,
    onRejected?: (a: Error) => R | PromiseLike<R>
  ): Promise<T | R> {
    return this._taskCompletionResolver.promise.then(onFulfilled, onRejected);
  }

  /**
   * Notifies all observers that bundle loading has completed, with a provided
   * `LoadBundleTaskProgress` object.
   */
  _completeWith(progress: firestore.LoadBundleTaskProgress): void {
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
  _updateProgress(progress: firestore.LoadBundleTaskProgress): void {
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
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  firestoreClientLoadBundle(
    ensureFirestoreConfigured(db._delegate),
    bundleData,
    resultTask
  );
  return resultTask;
}

export function namedQuery(
  db: Firestore,
  name: string
): Promise<firestore.Query | null> {
  return firestoreClientGetNamedQuery(
    ensureFirestoreConfigured(db._delegate),
    name
  ).then(namedQuery => {
    if (!namedQuery) {
      return null;
    }

    return new Query(namedQuery.query, db, null);
  });
}

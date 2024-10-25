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
  UploadTask,
  StorageError,
  UploadTaskSnapshot,
  TaskEvent,
  StorageObserver
} from '@firebase/storage';
import { UploadTaskSnapshotCompat } from './tasksnapshot';
import { ReferenceCompat } from './reference';
import * as types from '@firebase/storage-types';
import { Compat } from '@firebase/util';

export class UploadTaskCompat implements types.UploadTask, Compat<UploadTask> {
  constructor(
    readonly _delegate: UploadTask,
    private readonly _ref: ReferenceCompat
  ) {}

  get snapshot(): UploadTaskSnapshotCompat {
    return new UploadTaskSnapshotCompat(
      this._delegate.snapshot,
      this,
      this._ref
    );
  }

  cancel = this._delegate.cancel.bind(this._delegate);
  catch = this._delegate.catch.bind(this._delegate);
  pause = this._delegate.pause.bind(this._delegate);
  resume = this._delegate.resume.bind(this._delegate);

  then(
    onFulfilled?: ((a: UploadTaskSnapshotCompat) => unknown) | null,
    onRejected?: ((a: StorageError) => unknown) | null
  ): Promise<unknown> {
    return this._delegate.then(snapshot => {
      if (onFulfilled) {
        return onFulfilled(
          new UploadTaskSnapshotCompat(snapshot, this, this._ref)
        );
      }
    }, onRejected);
  }

  on(
    type: TaskEvent,
    nextOrObserver?:
      | types.StorageObserver<UploadTaskSnapshotCompat>
      | null
      | ((a: UploadTaskSnapshotCompat) => unknown),
    error?: ((error: StorageError) => void) | null,
    completed?: () => void | null
  ): Unsubscribe | Subscribe<UploadTaskSnapshotCompat> {
    let wrappedNextOrObserver:
      | StorageObserver<UploadTaskSnapshot>
      | undefined
      | ((a: UploadTaskSnapshot) => unknown) = undefined;
    if (!!nextOrObserver) {
      if (typeof nextOrObserver === 'function') {
        wrappedNextOrObserver = (taskSnapshot: UploadTaskSnapshot) =>
          nextOrObserver(
            new UploadTaskSnapshotCompat(taskSnapshot, this, this._ref)
          );
      } else {
        wrappedNextOrObserver = {
          next: !!nextOrObserver.next
            ? (taskSnapshot: UploadTaskSnapshot) =>
                nextOrObserver.next!(
                  new UploadTaskSnapshotCompat(taskSnapshot, this, this._ref)
                )
            : undefined,
          complete: nextOrObserver.complete || undefined,
          error: nextOrObserver.error || undefined
        };
      }
    }
    return this._delegate.on(
      type,
      wrappedNextOrObserver,
      error || undefined,
      completed || undefined
    );
  }
}

/**
 * Subscribes to an event stream.
 */
export type Subscribe<T> = (
  next?: NextFn<T> | StorageObserver<T>,
  error?: ErrorFn,
  complete?: CompleteFn
) => Unsubscribe;

/**
 * Unsubscribes from a stream.
 */
export type Unsubscribe = () => void;

/**
 * Function that is called once for each value in a stream of values.
 */
export type NextFn<T> = (value: T) => void;

/**
 * A function that is called with a `FirebaseStorageError`
 * if the event stream ends due to an error.
 */
export type ErrorFn = (error: StorageError) => void;

/**
 * A function that is called if the event stream ends normally.
 */
export type CompleteFn = () => void;

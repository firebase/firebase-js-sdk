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
import { isFunction } from './type';
import { FirebaseStorageError } from './error';

/**
 * Function that is called once for each value in a stream of values.
 */
export type NextFn<T> = (value: T) => void;

/**
 * A function that is called with a `FirebaseStorageError`
 * if the event stream ends due to an error.
 */
export type ErrorFn = (error: FirebaseStorageError) => void;

/**
 * A function that is called if the event stream ends normally.
 */
export type CompleteFn = () => void;

/**
 * Unsubscribes from a stream.
 */
export type Unsubscribe = () => void;

/**
 * An observer identical to the `Observer` defined in packages/util except the
 * error passed into the ErrorFn is specifically a `FirebaseStorageError`.
 */
export interface StorageObserver<T> {
  /**
   * Function that is called once for each value in the event stream.
   */
  next?: NextFn<T>;
  /**
   * A function that is called with a `FirebaseStorageError`
   * if the event stream ends due to an error.
   */
  error?: ErrorFn;
  /**
   * A function that is called if the event stream ends normally.
   */
  complete?: CompleteFn;
}

/**
 * Subscribes to an event stream.
 */
export type Subscribe<T> = (
  next?: NextFn<T> | StorageObserver<T>,
  error?: ErrorFn,
  complete?: CompleteFn
) => Unsubscribe;

export class Observer<T> implements StorageObserver<T> {
  next?: NextFn<T>;
  error?: ErrorFn;
  complete?: CompleteFn;

  constructor(
    nextOrObserver?: NextFn<T> | StorageObserver<T>,
    error?: ErrorFn,
    complete?: CompleteFn
  ) {
    const asFunctions =
      isFunction(nextOrObserver) || error != null || complete != null;
    if (asFunctions) {
      this.next = nextOrObserver as NextFn<T>;
      this.error = error;
      this.complete = complete;
    } else {
      const observer = nextOrObserver as {
        next?: NextFn<T>;
        error?: ErrorFn;
        complete?: CompleteFn;
      };
      this.next = observer.next;
      this.error = observer.error;
      this.complete = observer.complete;
    }
  }
}

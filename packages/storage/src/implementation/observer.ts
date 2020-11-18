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
import * as type from './type';
import { FirebaseStorageError } from './error';

export type NextFn<T> = (value: T) => void;
export type ErrorFn = (error: FirebaseStorageError) => void;
export type CompleteFn = () => void;
export type Unsubscribe = () => void;

export interface StorageObserver<T> {
  next?: NextFn<T>;
  error?: ErrorFn;
  complete?: CompleteFn;
}

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
      type.isFunction(nextOrObserver) || error != null || complete != null;
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

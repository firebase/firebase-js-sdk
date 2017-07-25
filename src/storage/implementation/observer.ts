/**
* Copyright 2017 Google Inc.
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

type NextFn<T> = (value: T) => void;
type ErrorFn = (error: Error) => void;
type CompleteFn = () => void;
type Unsubscribe = () => void;

type Subscribe<T> = (
  next: NextFn<T> | { [name: string]: string | null },
  error?: ErrorFn,
  complete?: CompleteFn
) => Unsubscribe;

export { NextFn, ErrorFn, CompleteFn, Unsubscribe, Subscribe };

/**
 * @struct
 */
export class Observer<T> {
  next: NextFn<T> | null;
  error: ErrorFn | null;
  complete: CompleteFn | null;

  constructor(
    nextOrObserver: NextFn<T> | { [name: string]: string | null } | null,
    opt_error?: ErrorFn | null,
    opt_complete?: CompleteFn | null
  ) {
    let asFunctions =
      type.isFunction(nextOrObserver) ||
      type.isDef(opt_error) ||
      type.isDef(opt_complete);
    if (asFunctions) {
      this.next = nextOrObserver as NextFn<T> | null;
      this.error = opt_error || null;
      this.complete = opt_complete || null;
    } else {
      const observer = nextOrObserver as {
        next?: NextFn<T> | null;
        error?: ErrorFn | null;
        complete?: CompleteFn | null;
      };
      this.next = observer.next || null;
      this.error = observer.error || null;
      this.complete = observer.complete || null;
    }
  }
}

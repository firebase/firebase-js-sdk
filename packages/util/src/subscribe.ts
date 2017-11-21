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
export type NextFn<T> = (value: T) => void;
export type ErrorFn = (error: Error) => void;
export type CompleteFn = () => void;

export interface Observer<V, E> {
  // Called once for each value in a stream of values.
  next(value: V | null): any;

  // A stream terminates by a single call to EITHER error() or complete().
  error(error: E): any;

  // No events will be sent to next() once complete() is called.
  complete(): any;
}

// Allow for any of the Observer methods to be undefined.
export interface PartialObserver<T> {
  next?: NextFn<T>;
  error?: ErrorFn;
  complete?: CompleteFn;
}

// TODO: Support also Unsubscribe.unsubscribe?
export type Unsubscribe = () => void;

/**
 * The Subscribe interface has two forms - passing the inline function
 * callbacks, or a object interface with callback properties.
 */
export interface Subscribe<T> {
  (next?: NextFn<T>, error?: ErrorFn, complete?: CompleteFn): Unsubscribe;
  (observer: PartialObserver<T>): Unsubscribe;
}

export interface Observable<T> {
  // Subscribe method
  subscribe: Subscribe<T>;
}

export type Executor<T> = (observer: Observer<T, Error>) => void;

/**
 * Helper to make a Subscribe function (just like Promise helps make a
 * Thenable).
 *
 * @param executor Function which can make calls to a single Observer
 *     as a proxy.
 * @param onNoObservers Callback when count of Observers goes to zero.
 */
export function createSubscribe<T>(
  executor: Executor<T>,
  onNoObservers?: Executor<T>
): Subscribe<T> {
  let proxy = new ObserverProxy<T>(executor, onNoObservers);
  return proxy.subscribe.bind(proxy);
}

/**
 * Implement fan-out for any number of Observers attached via a subscribe
 * function.
 */
class ObserverProxy<T> implements Observer<T, Error> {
  private observers: Array<Observer<T, Error>> | undefined = [];
  private unsubscribes: Unsubscribe[] = [];
  private onNoObservers: Executor<T> | undefined;
  private observerCount = 0;
  // Micro-task scheduling by calling task.then().
  private task = Promise.resolve();
  private finalized = false;
  private finalError: Error;

  /**
   * @param executor Function which can make calls to a single Observer
   *     as a proxy.
   * @param onNoObservers Callback when count of Observers goes to zero.
   */
  constructor(executor: Executor<T>, onNoObservers?: Executor<T>) {
    this.onNoObservers = onNoObservers;
    // Call the executor asynchronously so subscribers that are called
    // synchronously after the creation of the subscribe function
    // can still receive the very first value generated in the executor.
    this.task
      .then(() => {
        executor(this);
      })
      .catch(e => {
        this.error(e);
      });
  }

  next(value: T) {
    this.forEachObserver((observer: Observer<T, Error>) => {
      observer.next(value);
    });
  }

  error(error: Error) {
    this.forEachObserver((observer: Observer<T, Error>) => {
      observer.error(error);
    });
    this.close(error);
  }

  complete() {
    this.forEachObserver((observer: Observer<T, Error>) => {
      observer.complete();
    });
    this.close();
  }

  /**
   * Subscribe function that can be used to add an Observer to the fan-out list.
   *
   * - We require that no event is sent to a subscriber sychronously to their
   *   call to subscribe().
   */
  subscribe(
    nextOrObserver: PartialObserver<T> | Function,
    error?: ErrorFn,
    complete?: CompleteFn
  ): Unsubscribe {
    let observer: Observer<T, Error>;

    if (
      nextOrObserver === undefined &&
      error === undefined &&
      complete === undefined
    ) {
      throw new Error('Missing Observer.');
    }

    // Assemble an Observer object when passed as callback functions.
    if (implementsAnyMethods(nextOrObserver, ['next', 'error', 'complete'])) {
      observer = nextOrObserver as Observer<T, Error>;
    } else {
      observer = {
        next: (nextOrObserver as any) as NextFn<T>,
        error: error,
        complete: complete
      } as Observer<T, Error>;
    }

    if (observer.next === undefined) {
      observer.next = noop as NextFn<T>;
    }
    if (observer.error === undefined) {
      observer.error = noop as ErrorFn;
    }
    if (observer.complete === undefined) {
      observer.complete = noop as CompleteFn;
    }

    let unsub = this.unsubscribeOne.bind(this, this.observers!.length);

    // Attempt to subscribe to a terminated Observable - we
    // just respond to the Observer with the final error or complete
    // event.
    if (this.finalized) {
      this.task.then(() => {
        try {
          if (this.finalError) {
            observer.error(this.finalError);
          } else {
            observer.complete();
          }
        } catch (e) {
          // nothing
        }
        return;
      });
    }

    this.observers!.push(observer as Observer<T, Error>);

    return unsub;
  }

  // Unsubscribe is synchronous - we guarantee that no events are sent to
  // any unsubscribed Observer.
  private unsubscribeOne(i: number) {
    if (this.observers === undefined || this.observers[i] === undefined) {
      return;
    }

    delete this.observers[i];

    this.observerCount -= 1;
    if (this.observerCount === 0 && this.onNoObservers !== undefined) {
      this.onNoObservers(this);
    }
  }

  private forEachObserver(fn: (observer: Observer<T, Error>) => void): void {
    if (this.finalized) {
      // Already closed by previous event....just eat the additional values.
      return;
    }

    // Since sendOne calls asynchronously - there is no chance that
    // this.observers will become undefined.
    for (let i = 0; i < this.observers!.length; i++) {
      this.sendOne(i, fn);
    }
  }

  // Call the Observer via one of it's callback function. We are careful to
  // confirm that the observe has not been unsubscribed since this asynchronous
  // function had been queued.
  private sendOne(i: number, fn: (observer: Observer<T, Error>) => void): void {
    // Execute the callback asynchronously
    this.task.then(() => {
      if (this.observers !== undefined && this.observers[i] !== undefined) {
        try {
          fn(this.observers[i]);
        } catch (e) {
          // Ignore exceptions raised in Observers or missing methods of an
          // Observer.
          // Log error to console. b/31404806
          if (typeof console !== 'undefined' && console.error) {
            console.error(e);
          }
        }
      }
    });
  }

  private close(err?: Error): void {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    if (err !== undefined) {
      this.finalError = err;
    }
    // Proxy is no longer needed - garbage collect references
    this.task.then(() => {
      this.observers = undefined;
      this.onNoObservers = undefined;
    });
  }
}

/** Turn synchronous function into one called asynchronously. */
export function async(fn: Function, onError?: ErrorFn): Function {
  return (...args: any[]) => {
    Promise.resolve(true)
      .then(() => {
        fn(...args);
      })
      .catch((error: Error) => {
        if (onError) {
          onError(error);
        }
      });
  };
}

/**
 * Return true if the object passed in implements any of the named methods.
 */
function implementsAnyMethods(obj: any, methods: string[]): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  for (let method of methods) {
    if (method in obj && typeof obj[method] === 'function') {
      return true;
    }
  }

  return false;
}

function noop(): void {
  // do nothing
}

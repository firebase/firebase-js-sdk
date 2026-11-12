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

import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi
} from 'vitest';
import { async, createSubscribe, Observer, Subscribe } from '../src/subscribe';

describe('createSubscribe', () => {
  let spy: MockInstance;
  beforeEach(() => {
    // Listen to console.error calls.
    spy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('Creation', () =>
    new Promise<void>((resolve, reject) => {
      const subscribe = createSubscribe<number>(
        (observer: Observer<number>) => {
          observer.next(123);
        }
      );

      const unsub = subscribe((value: number) => {
        try {
          unsub();
          assert.equal(value, 123);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }));

  it('Logging observer error to console', () =>
    new Promise<void>((resolve, reject) => {
      const uncatchableError = new Error('uncatchable');
      const subscribe = createSubscribe<number>(
        (observer: Observer<number>) => {
          observer.next(123);
          observer.complete();
        }
      );

      subscribe({
        next(value) {
          try {
            assert.equal(value, 123);
          } catch (err) {
            reject(err);
            return;
          }
          // Simulate an error is thrown in the next callback.
          // This should log to the console as an error.
          throw uncatchableError;
        },
        complete() {
          try {
            // By this point, the error should have been logged.
            expect(spy).toHaveBeenCalledWith(uncatchableError);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
    }));

  it('Well-defined subscription order', () =>
    new Promise<void>((resolve, reject) => {
      const subscribe = createSubscribe<number>(observer => {
        observer.next(123);
        // Subscription after value emitted should NOT be received.
        subscribe({
          next(_value) {
            reject(new Error('Subscription after value emitted was called'));
          }
        });
      });
      // Subscription before value emitted should be received.
      subscribe({
        next(_value) {
          resolve();
        }
      });
    }));

  it('Subscribing to already complete Subscribe', () =>
    new Promise<void>((resolve, reject) => {
      let seq = 0;
      const subscribe = createSubscribe<number>(observer => {
        observer.next(456);
        observer.complete();
      });
      subscribe({
        next(value: number) {
          try {
            assert.equal(seq++, 0);
            assert.equal(value, 456);
          } catch (err) {
            reject(err);
          }
        },
        complete() {
          subscribe({
            complete() {
              try {
                assert.equal(seq++, 1);
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          });
        }
      });
    }));

  it('Subscribing to errored Subscribe', () =>
    new Promise<void>((resolve, reject) => {
      let seq = 0;
      const subscribe = createSubscribe<number>(observer => {
        observer.next(246);
        observer.error(new Error('failure'));
      });
      subscribe({
        next(value: number) {
          try {
            assert.equal(seq++, 0);
            assert.equal(value, 246);
          } catch (err) {
            reject(err);
          }
        },
        error(e) {
          try {
            assert.equal(seq++, 1);
          } catch (err) {
            reject(err);
            return;
          }
          subscribe({
            error(_e2) {
              try {
                assert.equal(seq++, 2);
                assert.equal(e.message, 'failure');
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          });
        },
        complete() {
          reject(new Error('complete should not be called'));
        }
      });
    }));

  it('Delayed value', () =>
    new Promise<void>((resolve, reject) => {
      const subscribe = createSubscribe<number>(
        (observer: Observer<number>) => {
          setTimeout(() => observer.next(123), 10);
        }
      );

      subscribe((value: number) => {
        try {
          assert.equal(value, 123);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }));

  it('Executor throws => Error', () =>
    new Promise<void>((resolve, reject) => {
      // It's an application error to throw an exception in the executor -
      // but since it is called asynchronously, our only option is
      // to emit that Error and terminate the Subscribe.
      const subscribe = createSubscribe<number>(
        (_observer: Observer<number>) => {
          throw new Error('Executor throws');
        }
      );
      subscribe({
        error(e) {
          try {
            assert.equal(e.message, 'Executor throws');
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
    }));

  it('Sequence', () =>
    new Promise<void>((resolve, reject) => {
      const subscribe = makeCounter(10);

      let j = 1;
      subscribe({
        next(value: number) {
          try {
            assert.equal(value, j++);
          } catch (err) {
            reject(err);
          }
        },
        complete() {
          try {
            assert.equal(j, 11);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
    }));

  it('unlisten', () =>
    new Promise<void>((resolve, reject) => {
      const subscribe = makeCounter(10);

      subscribe({
        complete: () => {
          async(resolve)();
        }
      });

      let j = 1;
      const unsub = subscribe({
        next: (value: number) => {
          try {
            assert.ok(value <= 5);
            assert.equal(value, j++);
            if (value === 5) {
              unsub();
            }
          } catch (err) {
            reject(err);
          }
        },
        complete: () => {
          reject(new Error('Does not call completed if unsubscribed'));
        }
      });
    }));

  it('onNoObservers', () =>
    new Promise<void>((resolve, reject) => {
      const subscribe = makeCounter(10);

      let j = 1;
      const unsub = subscribe({
        next: (value: number) => {
          try {
            assert.ok(value <= 5);
            assert.equal(value, j++);
            if (value === 5) {
              unsub();
              async(resolve)();
            }
          } catch (err) {
            reject(err);
          }
        },
        complete: () => {
          reject(new Error('Does not call completed if unsubscribed'));
        }
      });
    }));

  // TODO(koss): Add test for partial Observer (missing methods).
  it('Partial Observer', () =>
    new Promise<void>(resolve => {
      const subscribe = makeCounter(10);

      const _unsub = subscribe({
        complete: () => {
          resolve();
        }
      });
    }));
});

function makeCounter(maxCount: number, ms = 10): Subscribe<number> {
  let id: any;

  return createSubscribe<number>(
    (observer: Observer<number>) => {
      let i = 1;
      id = setInterval(() => {
        observer.next(i++);
        if (i > maxCount) {
          if (id) {
            clearInterval(id);
            id = undefined;
          }
          observer.complete();
        }
      }, ms);
    },
    (_observer: Observer<number>) => {
      clearInterval(id);
      id = undefined;
    }
  );
}

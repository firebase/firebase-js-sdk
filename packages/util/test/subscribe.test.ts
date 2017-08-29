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

import { assert } from 'chai';
import * as sinon from 'sinon';
import {
  async,
  CompleteFn,
  createSubscribe,
  ErrorFn,
  NextFn,
  Observer,
  Subscribe,
  Unsubscribe
} from '../src/subscribe';

describe('createSubscribe', function() {
  let spy: any;
  beforeEach(() => {
    // Listen to console.error calls.
    spy = sinon.spy(console, 'error');
  });

  afterEach(() => {
    spy.restore();
  });

  it('Creation', done => {
    let subscribe = createSubscribe<number>((observer: Observer<number>) => {
      observer.next(123);
    });

    let unsub = subscribe((value: number) => {
      unsub();
      assert.equal(value, 123);
      done();
    });
  });

  it('Logging observer error to console', done => {
    let uncatchableError = new Error('uncatchable');
    let subscribe = createSubscribe<number>((observer: Observer<number>) => {
      observer.next(123);
      observer.complete();
    });

    subscribe({
      next(value) {
        assert.equal(value, 123);
        // Simulate an error is thrown in the next callback.
        // This should log to the console as an error.
        throw uncatchableError;
      },
      complete() {
        // By this point, the error should have been logged.
        assert.ok(spy.calledWith(uncatchableError));
        done();
      }
    });
  });

  it('Well-defined subscription order', done => {
    let subscribe = createSubscribe<number>(observer => {
      observer.next(123);
      // Subscription after value emitted should NOT be received.
      subscribe({
        next(value) {
          assert.ok(false);
        }
      });
    });
    // Subscription before value emitted should be recieved.
    subscribe({
      next(value) {
        done();
      }
    });
  });

  it('Subscribing to already complete Subscribe', done => {
    let seq = 0;
    let subscribe = createSubscribe<number>(observer => {
      observer.next(456);
      observer.complete();
    });
    subscribe({
      next(value: number) {
        assert.equal(seq++, 0);
        assert.equal(value, 456);
      },
      complete() {
        subscribe({
          complete() {
            assert.equal(seq++, 1);
            done();
          }
        });
      }
    });
  });

  it('Subscribing to errored Subscribe', done => {
    let seq = 0;
    let subscribe = createSubscribe<number>(observer => {
      observer.next(246);
      observer.error(new Error('failure'));
    });
    subscribe({
      next(value: number) {
        assert.equal(seq++, 0);
        assert.equal(value, 246);
      },
      error(e) {
        assert.equal(seq++, 1);
        subscribe({
          error(e2) {
            assert.equal(seq++, 2);
            assert.equal(e.message, 'failure');
            done();
          }
        });
      },
      complete() {
        assert.ok(false);
      }
    });
  });

  it('Delayed value', done => {
    let subscribe = createSubscribe<number>((observer: Observer<number>) => {
      setTimeout(() => observer.next(123), 10);
    });

    subscribe((value: number) => {
      assert.equal(value, 123);
      done();
    });
  });

  it('Executor throws => Error', () => {
    // It's an application error to throw an exception in the executor -
    // but since it is called asynchronously, our only option is
    // to emit that Error and terminate the Subscribe.
    let subscribe = createSubscribe<number>((observer: Observer<number>) => {
      throw new Error('Executor throws');
    });
    subscribe({
      error(e) {
        assert.equal(e.message, 'Executor throws');
      }
    });
  });

  it('Sequence', done => {
    let subscribe = makeCounter(10);

    let j = 1;
    subscribe({
      next(value: number) {
        assert.equal(value, j++);
      },
      complete() {
        assert.equal(j, 11);
        done();
      }
    });
  });

  it('unlisten', done => {
    let subscribe = makeCounter(10);

    subscribe({
      complete: () => {
        async(done)();
      }
    });

    let j = 1;
    let unsub = subscribe({
      next: (value: number) => {
        assert.ok(value <= 5);
        assert.equal(value, j++);
        if (value === 5) {
          unsub();
        }
      },
      complete: () => {
        assert.ok(false, 'Does not call completed if unsubscribed');
      }
    });
  });

  it('onNoObservers', done => {
    let subscribe = makeCounter(10);

    let j = 1;
    let unsub = subscribe({
      next: (value: number) => {
        assert.ok(value <= 5);
        assert.equal(value, j++);
        if (value === 5) {
          unsub();
          async(done)();
        }
      },
      complete: () => {
        assert.ok(false, 'Does not call completed if unsubscribed');
      }
    });
  });

  // TODO(koss): Add test for partial Observer (missing methods).
  it('Partial Observer', done => {
    let subscribe = makeCounter(10);

    let unsub = subscribe({
      complete: () => {
        done();
      }
    });
  });
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
    (observer: Observer<number>) => {
      clearInterval(id);
      id = undefined;
    }
  );
}

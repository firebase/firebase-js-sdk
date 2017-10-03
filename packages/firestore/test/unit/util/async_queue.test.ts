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

import { expect } from 'chai';
import { AsyncQueue } from '../../../../src/firestore/util/async_queue';
import {
  getLogLevel,
  LogLevel,
  setLogLevel
} from '../../../../src/firestore/util/log';
import { AnyJs } from '../../../../src/firestore/util/misc';
import { Deferred } from '../../../../src/firestore/util/promise';
import { Rejecter } from '../../../../src/firestore/util/promise';
import { Resolver } from '../../../../src/firestore/util/promise';

describe('AsyncQueue', () => {
  it('schedules ops in right order', () => {
    const queue = new AsyncQueue();
    const results: string[] = [];

    function pushResult(result: string): void {
      results.push(result);
    }

    const op1 = queue.schedule(() => {
      return defer(() => 'Hello')
        .then((result: string) => {
          return defer(() => result + ' world!');
        })
        .then(pushResult);
    });

    const op2 = queue.schedule(() => {
      return defer(() => 'Bye bye.').then(pushResult);
    });

    const op4 = new Deferred<void>();
    const op3 = queue.schedule(() => {
      queue.schedule(() => {
        return Promise.resolve('Bye for good.')
          .then(pushResult)
          .then(op4.resolve);
      });

      return Promise.resolve('Welcome back.').then(pushResult);
    });

    return Promise.all([op1, op2, op3])
      .then(() => {
        expect(results[0]).to.deep.equal('Hello world!');
        expect(results[1]).to.deep.equal('Bye bye.');
        expect(results[2]).to.deep.equal('Welcome back.');
        return op4.promise;
      })
      .then(() => {
        expect(results[3]).to.deep.equal('Bye for good.');
      });
  });

  it('handles failures', () => {
    const queue = new AsyncQueue();
    const expected = new Error('Simulated error');

    // Disable logging for this test to avoid the assertion being logged
    const oldLogLevel = getLogLevel();
    setLogLevel(LogLevel.SILENT);
    return queue
      .schedule(() => {
        // This promise represents something that is rejected
        return defer(() => {
          throw expected;
        });
      })
      .then(
        () => {
          expect.fail('expected an error');
        },
        (err: AnyJs) => {
          expect(err).to.equal(expected);
        }
      )
      .then(() => {
        expect(queue.failure).to.equal(expected);
      })
      .then(() => {
        setLogLevel(oldLogLevel);
      });
  });
});

function defer<T>(op: () => T): Promise<T> {
  return new Promise((resolve: Resolver<T>, reject: Rejecter) => {
    setTimeout(() => {
      try {
        resolve(op());
      } catch (e) {
        reject(e);
      }
    }, 0);
  });
}

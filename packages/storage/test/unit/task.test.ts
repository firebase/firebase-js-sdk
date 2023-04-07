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
import { assert, expect, use } from 'chai';
import { FbsBlob } from '../../src/implementation/blob';
import { Location } from '../../src/implementation/location';
import { Unsubscribe } from '../../src/implementation/observer';
import { TaskEvent, TaskState } from '../../src/implementation/taskenums';
import { Reference } from '../../src/reference';
import { UploadTask } from '../../src/task';
import {
  fake503ForFinalizeServerHandler,
  fakeOneShot503ServerHandler,
  fake503ForUploadServerHandler,
  fakeServerHandler,
  RequestHandler,
  storageServiceWithHandler
} from './testshared';
import { injectTestConnection } from '../../src/platform/connection';
import { Deferred } from '@firebase/util';
import { canceled, retryLimitExceeded } from '../../src/implementation/error';
import { SinonFakeTimers, useFakeTimers } from 'sinon';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { DEFAULT_MAX_UPLOAD_RETRY_TIME } from '../../src/implementation/constants';

use(sinonChai);

const testLocation = new Location('bucket', 'object');
const smallBlob = new FbsBlob(new Uint8Array([97]));
const bigBlob = new FbsBlob(new ArrayBuffer(1024 * 1024));

describe('Firebase Storage > Upload Task', () => {
  let clock: SinonFakeTimers;
  after(() => {
    injectTestConnection(null);
  });

  it('Works for a small upload w/ an observer', done => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      smallBlob
    );
    task.on(
      TaskEvent.STATE_CHANGED,
      undefined,
      () => assert.fail('Unexpected upload failure'),
      () => done()
    );
  });
  it('Works for a small upload w/ a promise', () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      smallBlob
    );
    return task.then(snapshot => {
      assert.equal(snapshot.totalBytes, smallBlob.size());
    });
  });
  it('Works for a small upload canceled w/ a promise', () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      smallBlob
    );
    const promise: Promise<string | null> = task.then<string | null>(
      () => {
        assert.fail('task completed, but should have failed');
        return null;
      },
      () => 'Task failed as expected'
    );
    task.cancel();
    return promise;
  });
  it('Works properly with multiple observers', () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      smallBlob
    );

    let badComplete = false;
    const h1: Unsubscribe = task.on(
      TaskEvent.STATE_CHANGED,
      undefined,
      undefined,
      () => {
        badComplete = true;
      }
    ) as Unsubscribe;
    const h2: Unsubscribe = task.on(
      TaskEvent.STATE_CHANGED,
      undefined,
      undefined,
      () => {
        badComplete = true;
      }
    ) as Unsubscribe;

    let resumed = 0;

    // h3: This one will get executed immediately
    (() => {
      let lastState: TaskState;
      return task.on(
        TaskEvent.STATE_CHANGED,
        snapshot => {
          if (
            lastState !== TaskState.RUNNING &&
            snapshot.state === TaskState.RUNNING
          ) {
            resumed++;
          }
          lastState = snapshot.state;
        },
        undefined,
        undefined
      );
    })();
    h1();
    h2();

    return new Promise<void>(resolve => {
      task.on(
        TaskEvent.STATE_CHANGED,
        undefined,
        () => {
          assert.fail('Upload failed');
        },
        () => {
          assert.isFalse(badComplete);
          assert.equal(resumed, 1);
          resolve();
        }
      );
    });
  });
  it("Works properly with an observer missing the 'next' method", () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      smallBlob
    );
    return new Promise<void>(resolve => {
      task.on(TaskEvent.STATE_CHANGED, {
        error: () => {
          assert.fail('Unexpected upload failure');
        },
        complete: () => {
          resolve();
        }
      });
    });
  });

  /**
   * Takes a blob, uploads the blob, and tracks the events in the `events` array. It asserts in the `onComplete` callback itself.
   *
   * @param blob Blob to upload
   * @returns resolved/rejected promise
   */
  function runNormalUploadTest(blob: FbsBlob): Promise<void> {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      blob
    );

    // eslint-disable-next-line @typescript-eslint/ban-types
    let resolve: Function, reject: Function;
    const promise = new Promise<void>((innerResolve, innerReject) => {
      resolve = innerResolve;
      reject = innerReject;
    });

    // Assert functions throw Errors, which means if we're not in the right stack
    // the error might not get reported properly. This function wraps existing
    // assert functions, returning a new function that calls reject with any
    // caught errors. This should make sure errors are reported properly.
    function promiseAssertWrapper<T>(func: T): T {
      function wrapped(..._args: any[]): void {
        try {
          (func as any as (...args: any[]) => void).apply(null, _args);
        } catch (e) {
          reject(e);
          // also throw to further unwind the stack
          throw e;
        }
      }
      return wrapped as any as T;
    }

    const fixedAssertEquals = promiseAssertWrapper(assert.equal);
    const fixedAssertFalse = promiseAssertWrapper(assert.isFalse);
    const fixedAssertTrue = promiseAssertWrapper(assert.isTrue);
    const fixedAssertFail = promiseAssertWrapper(assert.fail);

    const events: string[] = [];
    const progress: number[][] = [];
    let complete = 0;
    function addCallbacks(task: UploadTask): void {
      let lastState: string;
      task.on(
        TaskEvent.STATE_CHANGED,
        snapshot => {
          fixedAssertEquals(complete, 0);

          const state = snapshot.state;
          if (lastState !== TaskState.RUNNING && state === TaskState.RUNNING) {
            events.push('resume');
          } else if (
            lastState !== TaskState.PAUSED &&
            state === TaskState.PAUSED
          ) {
            events.push('pause');
          }

          const p = [snapshot.bytesTransferred, snapshot.totalBytes];
          progress.push(p);

          lastState = state;
        },
        () => {
          fixedAssertFail('upload failed');
        },
        () => {
          events.push('complete');
          complete++;
        }
      );
    }
    addCallbacks(task);

    (function () {
      let lastState: string;
      task.on(TaskEvent.STATE_CHANGED, snapshot => {
        const state = snapshot.state;
        if (lastState !== TaskState.PAUSED && state === TaskState.PAUSED) {
          events.push('timeout');
          setTimeout(() => {
            task.resume();
          }, 200);
        }
        lastState = state;
      });
    })();

    let completeTriggered = false;

    task.on(TaskEvent.STATE_CHANGED, undefined, undefined, () => {
      fixedAssertFalse(completeTriggered);
      completeTriggered = true;

      fixedAssertEquals(events.length, 5);
      fixedAssertEquals(events[0], 'resume');
      fixedAssertEquals(events[1], 'pause');
      fixedAssertEquals(events[2], 'timeout');
      fixedAssertEquals(events[3], 'resume');
      fixedAssertEquals(events[4], 'complete');

      fixedAssertEquals(complete, 1);

      let increasing = true;
      let allTotalsTheSame = true;
      for (let i = 0; i < progress.length - 1; i++) {
        increasing = increasing && progress[i][0] <= progress[i + 1][0];
        allTotalsTheSame =
          allTotalsTheSame && progress[i][1] === progress[i + 1][1];
      }

      let lastIsAll = false;
      if (progress.length > 0) {
        const last = progress[progress.length - 1];
        lastIsAll = last[0] === last[1];
      } else {
        lastIsAll = true;
      }

      fixedAssertTrue(increasing);
      fixedAssertTrue(allTotalsTheSame);
      fixedAssertTrue(lastIsAll);

      // serves as the cancellation task. It will cancel immediately and upon completion, will check that an error occurred
      const task2 = new UploadTask(
        new Reference(storageService, testLocation),
        blob
      );
      const events2: string[] = [];

      (function () {
        let lastState: string;
        task2.on(
          TaskEvent.STATE_CHANGED,
          snapshot => {
            const state = snapshot.state;
            // TODO: This status update should probably be extracted out in a helper function.
            if (
              lastState !== TaskState.RUNNING &&
              state === TaskState.RUNNING
            ) {
              events2.push('resume');
            } else if (
              lastState !== TaskState.PAUSED &&
              state === TaskState.PAUSED
            ) {
              events2.push('pause');
            }
            lastState = state;
          },
          () => {
            // TODO: These assertions should be moved down. Adding them here makes it unclear what the assertions are.
            events2.push('failure');
            fixedAssertEquals(events2.length, 2);
            fixedAssertEquals(events2[0], 'resume');
            // This is not enough. Simply asserting that there was some failure doesn't validate that the *right* error was thrown.
            fixedAssertEquals(events2[1], 'failure');
            resolve(null);
          },
          () => {
            fixedAssertFail('Completed when we should have canceled');
          }
        );
      })();
      task2.cancel();
    });

    task.pause();
    return promise;
  }

  // This is to test to make sure that when you pause in the middle of a request that you do not get an error
  async function runProgressPauseTest(blob: FbsBlob): Promise<void> {
    let callbackCount = 0;
    // Usually the first request is to create the resumable upload and the second is to upload.
    // Upload requests are not retryable, and this callback is to make sure we pause before the response comes back.
    function shouldRespondCallback(): boolean {
      if (callbackCount++ === 1) {
        task.pause();
      }
      return true;
    }
    const storageService = storageServiceWithHandler(
      fakeServerHandler(),
      shouldRespondCallback
    );
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      blob
    );

    // eslint-disable-next-line @typescript-eslint/ban-types
    let resolve: Function, reject: Function;
    const promise = new Promise<void>((innerResolve, innerReject) => {
      resolve = innerResolve;
      reject = innerReject;
    });

    // Assert functions throw Errors, which means if we're not in the right stack
    // the error might not get reported properly. This function wraps existing
    // assert functions, returning a new function that calls reject with any
    // caught errors. This should make sure errors are reported properly.
    function promiseAssertWrapper<T>(func: T): T {
      function wrapped(..._args: any[]): void {
        try {
          (func as any as (...args: any[]) => void).apply(null, _args);
        } catch (e) {
          reject(e);
          pausedStateCompleted.reject(e);
          // also throw to further unwind the stack
          throw e;
        }
      }
      return wrapped as any as T;
    }

    const fixedAssertEquals = promiseAssertWrapper(assert.equal);
    const fixedAssertFalse = promiseAssertWrapper(assert.isFalse);
    const fixedAssertTrue = promiseAssertWrapper(assert.isTrue);
    const fixedAssertFail = promiseAssertWrapper(assert.fail);

    const events: string[] = [];
    const progress: number[][] = [];
    // Promise for when we are finally in the pause state
    const pausedStateCompleted = new Deferred();
    let complete = 0;
    // Adds a callback for when the state has changed. The callback resolves the pausedStateCompleted promise
    // to let our test know when to resume.
    function addCallbacks(task: UploadTask): void {
      let lastState: string;
      task.on(
        TaskEvent.STATE_CHANGED,
        snapshot => {
          fixedAssertEquals(complete, 0);

          const state = snapshot.state;
          if (lastState !== TaskState.RUNNING && state === TaskState.RUNNING) {
            events.push('resume');
          } else if (
            lastState !== TaskState.PAUSED &&
            state === TaskState.PAUSED
          ) {
            pausedStateCompleted.resolve();
            events.push('pause');
          }

          const p = [snapshot.bytesTransferred, snapshot.totalBytes];

          progress.push(p);

          lastState = state;
        },
        () => {
          fixedAssertFail('Failed to upload');
        },
        () => {
          events.push('complete');
          complete++;
        }
      );
    }

    addCallbacks(task);

    let completeTriggered = false;

    // We should clean this up and just add all callbacks in one function call.
    // Keeps track of all events that were logged before and asserts on them.
    task.on(TaskEvent.STATE_CHANGED, undefined, undefined, () => {
      fixedAssertFalse(completeTriggered);
      completeTriggered = true;

      fixedAssertEquals(events.length, 4);
      fixedAssertEquals(events[0], 'resume');
      fixedAssertEquals(events[1], 'pause');
      fixedAssertEquals(events[2], 'resume');
      fixedAssertEquals(events[3], 'complete');

      fixedAssertEquals(complete, 1);

      let increasing = true;
      let allTotalsTheSame = true;
      for (let i = 0; i < progress.length - 1; i++) {
        increasing = increasing && progress[i][0] <= progress[i + 1][0];
        allTotalsTheSame =
          allTotalsTheSame && progress[i][1] === progress[i + 1][1];
      }

      let lastIsAll = false;
      if (progress.length > 0) {
        const last = progress[progress.length - 1];
        lastIsAll = last[0] === last[1];
      } else {
        lastIsAll = true;
      }

      fixedAssertTrue(increasing);
      fixedAssertTrue(allTotalsTheSame);
      fixedAssertTrue(lastIsAll);
      resolve(null);
    });
    await pausedStateCompleted.promise;
    task.resume();
    return promise;
  }
  enum StateType {
    RESUME = 'resume',
    PAUSE = 'pause',
    ERROR = 'error',
    COMPLETE = 'complete'
  }
  interface State {
    type: StateType;
    data?: Error;
  }
  interface Progress {
    bytesTransferred: number;
    totalBytes: number;
  }
  interface TotalState {
    events: State[];
    progress: Progress[];
  }

  function handleStateChange(
    requestHandler: RequestHandler,
    blob: FbsBlob
  ): { taskPromise: Promise<TotalState>; task: UploadTask } {
    const storageService = storageServiceWithHandler(requestHandler);
    const task = new UploadTask(
      new Reference(storageService, testLocation),
      blob
    );

    const deferred = new Deferred<TotalState>();
    let lastState: TaskState;

    const events: State[] = [];
    const progress: Progress[] = [];

    task.on(
      TaskEvent.STATE_CHANGED,
      snapshot => {
        const { state } = snapshot;
        if (lastState !== TaskState.RUNNING && state === TaskState.RUNNING) {
          events.push({ type: StateType.RESUME });
        } else if (
          lastState !== TaskState.PAUSED &&
          state === TaskState.PAUSED
        ) {
          events.push({ type: StateType.PAUSE });
        }
        const p = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes
        };
        progress.push(p);

        lastState = state;
      },
      function onError(e) {
        events.push({ type: StateType.ERROR, data: e });
        deferred.resolve({
          events,
          progress
        });
      },
      function onComplete() {
        events.push({ type: StateType.COMPLETE });
        deferred.resolve({
          events,
          progress
        });
      }
    );

    return { taskPromise: deferred.promise, task };
  }

  it('Calls callback sequences for small uploads correctly', () => {
    return runNormalUploadTest(smallBlob);
  });
  it('Calls callback sequences for big uploads correctly', () => {
    return runNormalUploadTest(bigBlob);
  });
  it('properly times out if large blobs returns a 503 when finalizing', async () => {
    clock = useFakeTimers();
    // Kick off upload
    const { taskPromise } = handleStateChange(
      fake503ForFinalizeServerHandler(),
      bigBlob
    );
    // Run all timers
    await clock.runAllAsync();
    const { events, progress } = await taskPromise;
    expect(events.length).to.equal(2);
    expect(events[0]).to.deep.equal({ type: 'resume' });
    expect(events[1].type).to.deep.equal('error');
    const retryLimitError = retryLimitExceeded();
    expect(events[1].data!.name).to.deep.equal(retryLimitError.name);
    expect(events[1].data!.message).to.deep.equal(retryLimitError.message);
    const blobSize = bigBlob.size();
    expect(progress.length).to.equal(4);
    expect(progress[0]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    expect(progress[1]).to.deep.equal({
      bytesTransferred: 262144,
      totalBytes: blobSize
    });
    // Upon continueUpload the multiplier becomes * 2, so chunkSize becomes 2 * DEFAULT_CHUNK_SIZE(256 * 1024)
    expect(progress[2]).to.deep.equal({
      bytesTransferred: 786432,
      totalBytes: blobSize
    });
    // Chunk size is smaller here since there are less bytes left to upload than the chunkSize.
    expect(progress[3]).to.deep.equal({
      bytesTransferred: 1048576,
      totalBytes: blobSize
    });
    clock.restore();
  });
  it('properly times out if large blobs returns a 503 when uploading', async () => {
    clock = useFakeTimers();
    // Kick off upload
    const { taskPromise } = handleStateChange(
      fake503ForUploadServerHandler(),
      bigBlob
    );
    // Run all timers
    await clock.runAllAsync();
    const { events, progress } = await taskPromise;
    expect(events.length).to.equal(2);
    expect(events[0]).to.deep.equal({ type: 'resume' });
    expect(events[1].type).to.deep.equal('error');
    const retryLimitError = retryLimitExceeded();
    expect(events[1].data!.name).to.deep.equal(retryLimitError.name);
    expect(events[1].data!.message).to.deep.equal(retryLimitError.message);
    const blobSize = bigBlob.size();
    expect(progress.length).to.equal(1);
    expect(progress[0]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    clock.restore();
  });

  /**
   * Starts upload, finds the first instance of an exponential backoff, and resolves `readyToCancel` when done.
   * @returns readyToCancel, taskPromise and task
   */
  function resumeCancelSetup(): {
    readyToCancel: Promise<null>;
    taskPromise: Promise<TotalState>;
    task: UploadTask;
  } {
    clock = useFakeTimers();
    const fakeSetTimeout = clock.setTimeout;

    let gotFirstEvent = false;

    const stub = sinon.stub(global, 'setTimeout');

    // Function that notifies when we are in the middle of an exponential backoff
    const readyToCancel = new Promise<null>(resolve => {
      // @ts-ignore The types for `stub.callsFake` is incompatible with types of `clock.setTimeout`
      stub.callsFake((fn, timeout) => {
        // @ts-ignore The types for `stub.callsFake` is incompatible with types of `clock.setTimeout`
        const res = fakeSetTimeout(fn, timeout);
        if (timeout !== DEFAULT_MAX_UPLOAD_RETRY_TIME) {
          if (!gotFirstEvent || timeout === 0) {
            clock.tick(timeout as number);
          } else {
            // If the timeout isn't 0 and it isn't the max upload retry time, it's most likely due to exponential backoff.
            resolve(null);
          }
        }
        return res;
      });
    });
    readyToCancel.then(
      () => stub.restore(),
      () => stub.restore()
    );
    return {
      ...handleStateChange(
        fake503ForUploadServerHandler(undefined, () => (gotFirstEvent = true)),
        bigBlob
      ),
      readyToCancel
    };
  }
  it('properly errors with a cancel StorageError if a pending timeout remains', async () => {
    // Kick off upload
    const { readyToCancel, taskPromise: promise, task } = resumeCancelSetup();

    await readyToCancel;
    task.cancel();

    const { events, progress } = await promise;
    expect(events.length).to.equal(2);
    expect(events[0]).to.deep.equal({ type: 'resume' });
    expect(events[1].type).to.deep.equal('error');
    const canceledError = canceled();
    expect(events[1].data!.name).to.deep.equal(canceledError.name);
    expect(events[1].data!.message).to.deep.equal(canceledError.message);
    const blobSize = bigBlob.size();
    expect(progress.length).to.equal(1);
    expect(progress[0]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    expect(clock.countTimers()).to.eq(0);
    clock.restore();
  });
  it('properly errors with a pause StorageError if a pending timeout remains', async () => {
    // Kick off upload
    const { readyToCancel, taskPromise: promise, task } = resumeCancelSetup();

    // Wait for exponential backoff
    await readyToCancel;

    // Pause in the middle of a timer.
    task.pause();
    // Expect the pause to clear out any existing timers.
    expect(clock.countTimers()).to.eq(0);
    task.resume();
    // Run out any existing timers. <-- this is what needs to be checked.
    await clock.runAllAsync();

    // Run all timers
    const { events, progress } = await promise;
    expect(events.length).to.equal(4);
    expect(events[0]).to.deep.equal({ type: 'resume' });
    expect(events[1]).to.deep.equal({ type: 'pause' });
    expect(events[2]).to.deep.equal({ type: 'resume' });
    expect(events[3].type).to.deep.equal('error');
    const retryError = retryLimitExceeded();
    expect(events[3].data!.name).to.deep.equal(retryError.name);
    expect(events[3].data!.message).to.deep.equal(retryError.message);
    const blobSize = bigBlob.size();
    expect(progress.length).to.equal(3);
    expect(progress[0]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    expect(progress[1]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    expect(progress[2]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    expect(clock.countTimers()).to.eq(0);
    clock.restore();
  });
  it('does not error when pausing inflight request', async () => {
    // Kick off upload
    await runProgressPauseTest(bigBlob);
  });
  it('tests if small requests that respond with 500 retry correctly', async () => {
    clock = useFakeTimers();
    // Kick off upload
    const { taskPromise } = handleStateChange(
      fakeOneShot503ServerHandler(),
      smallBlob
    );
    // Run all timers
    await clock.runAllAsync();
    const { events, progress } = await taskPromise;
    expect(events.length).to.equal(2);
    expect(events[0]).to.deep.equal({ type: 'resume' });
    expect(events[1].type).to.deep.equal('error');
    const retryLimitError = retryLimitExceeded();
    expect(events[1].data!.name).to.deep.equal(retryLimitError.name);
    expect(events[1].data!.message).to.deep.equal(retryLimitError.message);
    const blobSize = smallBlob.size();
    expect(progress.length).to.equal(1);
    expect(progress[0]).to.deep.equal({
      bytesTransferred: 0,
      totalBytes: blobSize
    });
    clock.restore();
  });
});

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
import { assert } from 'chai';
import { FbsBlob } from '../../src/implementation/blob';
import { Location } from '../../src/implementation/location';
import { getMappings } from '../../src/implementation/metadata';
import { Unsubscribe } from '../../src/implementation/observer';
import { TaskEvent, TaskState } from '../../src/implementation/taskenums';
import { Headers } from '../../src/implementation/xhrio';
import { Reference } from '../../src/reference';
import { StorageService } from '../../src/service';
import { UploadTask } from '../../src/task';
import {
  assertThrows,
  bind as fbsBind,
  makePool,
  emptyAuthProvider
} from './testshared';
import { StringHeaders, TestingXhrIo } from './xhrio';

const testLocation = new Location('bucket', 'object');
const smallBlob = new FbsBlob(new Blob(['a']));
const bigBlob = new FbsBlob(new Blob([new ArrayBuffer(1024 * 1024)]));

const mappings = getMappings();

const fakeMetadata = '{ "downloadTokens": "a,b" }';

interface Response {
  status: number;
  body: string;
  headers: StringHeaders;
}
type RequestHandler = (
  url: string,
  method: string,
  body?: ArrayBufferView | Blob | string | null,
  headers?: Headers
) => Response;

function storageServiceWithHandler(handler: RequestHandler): StorageService {
  function newSend(
    xhrio: TestingXhrIo,
    url: string,
    method: string,
    body?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): void {
    const response = handler(url, method, body, headers);
    xhrio.simulateResponse(response.status, response.body, response.headers);
  }

  return new StorageService(null, emptyAuthProvider, makePool(newSend));
}

function fakeServerHandler(): RequestHandler {
  const stats: {
    [num: number]: {
      currentSize: number;
      finalSize: number;
    };
  } = {};

  let nextId: number = 0;

  function statusHeaders(
    status: string,
    existing?: StringHeaders
  ): StringHeaders {
    if (existing) {
      existing['X-Goog-Upload-Status'] = status;
      return existing;
    } else {
      return { 'X-Goog-Upload-Status': status };
    }
  }

  function handler(
    url: string,
    method: string,
    content?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Response {
    method = method || 'GET';
    content = content || '';
    headers = headers || {};

    if (headers['X-Goog-Upload-Protocol'] === 'multipart') {
      return {
        status: 200,
        body: fakeMetadata,
        headers: statusHeaders('final')
      };
    }

    const contentLength =
      (content as Blob).size || (content as string).length || 0;

    if (headers['X-Goog-Upload-Protocol'] === 'resumable') {
      const thisId = nextId;
      nextId++;
      stats[thisId] = {
        currentSize: 0,
        finalSize: +headers['X-Goog-Upload-Header-Content-Length']
      };

      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-URL': 'http://example.com?' + thisId
        })
      };
    }

    const matches = url.match(/^http:\/\/example\.com\?([0-9]+)$/);
    if (matches === null) {
      return { status: 400, body: '', headers: {} };
    }

    const id = +matches[1];
    if (!stats[id]) {
      return { status: 400, body: 'Invalid upload id', headers: {} };
    }

    if (headers['X-Goog-Upload-Command'] === 'query') {
      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-Size-Received': stats[id].currentSize.toString()
        })
      };
    }

    const commands = (headers['X-Goog-Upload-Command'] as string)
      .split(',')
      .map(str => {
        return str.trim();
      });
    const isUpload = commands.indexOf('upload') !== -1;
    const isFinalize = commands.indexOf('finalize') !== -1;
    const stat = stats[id];

    if (isUpload) {
      const offset = +headers['X-Goog-Upload-Offset'];
      if (offset !== stat.currentSize) {
        return { status: 400, body: 'Uploading at wrong offset', headers: {} };
      }

      stat.currentSize += contentLength;
      if (stat.currentSize > stat.finalSize) {
        return { status: 400, body: 'Too many bytes', headers: {} };
      } else if (!isFinalize) {
        return { status: 200, body: '', headers: statusHeaders('active') };
      }
    }

    if (isFinalize) {
      const isDone = stat.currentSize === stat.finalSize;
      if (isDone) {
        return {
          status: 200,
          body: fakeMetadata,
          headers: statusHeaders('final')
        };
      } else {
        return {
          status: 400,
          body: 'finalize without the right # of bytes',
          headers: {}
        };
      }
    }

    return { status: 400, body: '', headers: {} };
  }
  return handler;
}

describe('Firebase Storage > Upload Task', () => {
  it('Works for a small upload w/ an observer', done => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      storageService,
      testLocation,
      mappings,
      smallBlob
    );
    task.on(
      TaskEvent.STATE_CHANGED,
      null,
      () => assert.fail('Unexpected upload failure'),
      () => done()
    );
  });
  it('Works for a small upload w/ a promise', () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      storageService,
      testLocation,
      mappings,
      smallBlob
    );
    return task.then(snapshot => {
      assert.equal(snapshot.totalBytes, smallBlob.size());
    });
  });
  it('Works for a small upload canceled w/ a promise', () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      storageService,
      testLocation,
      mappings,
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
      {} as Reference,
      storageService,
      testLocation,
      mappings,
      smallBlob
    );

    let badComplete = false;
    const h1: Unsubscribe = task.on(TaskEvent.STATE_CHANGED, null, null, () => {
      badComplete = true;
    }) as Unsubscribe;
    const h2: Unsubscribe = task.on(TaskEvent.STATE_CHANGED, null, null, () => {
      badComplete = true;
    }) as Unsubscribe;

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
        null,
        null
      );
    })();
    h1();
    h2();

    return new Promise(resolve => {
      task.on(
        TaskEvent.STATE_CHANGED,
        null,
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
      {} as Reference,
      storageService,
      testLocation,
      mappings,
      smallBlob
    );
    return new Promise(resolve => {
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

  function runNormalUploadTest(blob: FbsBlob): Promise<void> {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      storageService,
      testLocation,
      mappings,
      blob
    );

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
          ((func as any) as (...args: any[]) => void).apply(null, _args);
        } catch (e) {
          reject(e);
          // also throw to further unwind the stack
          throw e;
        }
      }
      return (wrapped as any) as T;
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

    task.on(TaskEvent.STATE_CHANGED, null, null, () => {
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

      const task2 = new UploadTask(
        {} as Reference,
        storageService,
        testLocation,
        mappings,
        blob
      );
      const events2: string[] = [];

      (function () {
        let lastState: string;
        task2.on(
          TaskEvent.STATE_CHANGED,
          snapshot => {
            const state = snapshot.state;
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
            events2.push('failure');
            fixedAssertEquals(events2.length, 2);
            fixedAssertEquals(events2[0], 'resume');
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

  it('Calls callback sequences for small uploads correctly', () => {
    return runNormalUploadTest(smallBlob);
  });
  it('Calls callback sequences for big uploads correctly', () => {
    return runNormalUploadTest(bigBlob);
  });

  describe('Argument verification', () => {
    const storageService = storageServiceWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      storageService,
      testLocation,
      mappings,
      smallBlob
    );
    describe('on', () => {
      it('Throws on no args', () => {
        assertThrows(fbsBind(task.on, task), 'storage/invalid-argument-count');
      });
      it('Throws on 5 args', () => {
        assertThrows(
          fbsBind(task.on, task, TaskEvent.STATE_CHANGED, null, null, null, 1),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on a single string arg', () => {
        assertThrows(fbsBind(task.on, task, '3'), 'storage/invalid-argument');
      });
      it('Throws on a single null arg', () => {
        assertThrows(fbsBind(task.on, task, null), 'storage/invalid-argument');
      });
      it('Throws on a number arg instead of a function', () => {
        assertThrows(
          fbsBind(task.on, task, TaskEvent.STATE_CHANGED, null, null, 3),
          'storage/invalid-argument'
        );
      });
      it('Throws on an empty object arg', () => {
        assertThrows(
          fbsBind(task.on, task, TaskEvent.STATE_CHANGED, {}),
          'storage/invalid-argument'
        );
      });
    });
    describe('subscribe returned from on', () => {
      it('Throws on no args', () => {
        assertThrows(
          fbsBind(task.on(TaskEvent.STATE_CHANGED), null),
          'storage/invalid-argument-count'
        );
      });
      it('Throws on 4 args', () => {
        assertThrows(
          fbsBind(task.on(TaskEvent.STATE_CHANGED), null, null, null, null, 1),
          'storage/invalid-argument-count'
        );
      });
      it('Throws number arg instead of function', () => {
        assertThrows(
          fbsBind(task.on(TaskEvent.STATE_CHANGED), null, null, null, 3),
          'storage/invalid-argument'
        );
      });
      it('Throws on an empty object arg', () => {
        assertThrows(
          fbsBind(task.on(TaskEvent.STATE_CHANGED), null, {}),
          'storage/invalid-argument'
        );
      });
      it('Throws on a single null arg', () => {
        assertThrows(
          fbsBind(task.on(TaskEvent.STATE_CHANGED), null, null),
          'storage/invalid-argument'
        );
      });
    });
    describe('resume', () => {
      it('Throws on a number', () => {
        assertThrows(
          fbsBind(task.resume, task, 3),
          'storage/invalid-argument-count'
        );
      });
    });
    describe('pause', () => {
      it('Throws on a number', () => {
        assertThrows(
          fbsBind(task.pause, task, 3),
          'storage/invalid-argument-count'
        );
      });
    });
    describe('cancel', () => {
      it('Throws on a number', () => {
        assertThrows(
          fbsBind(task.cancel, task, 3),
          'storage/invalid-argument-count'
        );
      });
    });
  });
});

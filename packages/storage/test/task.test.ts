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
import * as arrayUtils from '../src/implementation/array';
import { AuthWrapper } from '../src/implementation/authwrapper';
import { FbsBlob } from '../src/implementation/blob';
import { Location } from '../src/implementation/location';
import { getMappings } from '../src/implementation/metadata';
import { Unsubscribe } from '../src/implementation/observer';
import * as fbsPromise from '../src/implementation/promise_external';
import { makeRequest } from '../src/implementation/request';
import {
  TaskEvent,
  TaskState
} from '../src/implementation/taskenums';
import { Headers } from '../src/implementation/xhrio';
import { Reference } from '../src/reference';
import { Service } from '../src/service';
import { UploadTask } from '../src/task';
import { assertThrows, bind as fbsBind, makePool } from './testshared';
import { StringHeaders, TestingXhrIo } from './xhrio';

const testLocation = new Location('bucket', 'object');
const smallBlob = new FbsBlob(new Blob(['a']));
const bigBlob = new FbsBlob(new Blob([new ArrayBuffer(1024 * 1024)]));

const mappings = getMappings();

const fakeMetadata = '{ "downloadTokens": "a,b" }';

type Response = {
  status: number;
  body: string;
  headers: StringHeaders;
};
type RequestHandler = (
  url: string,
  method: string,
  body?: ArrayBufferView | Blob | string,
  headers?: Headers
) => Response;

function authWrapperWithHandler(handler: RequestHandler): AuthWrapper {
  function newSend(
    xhrio: TestingXhrIo,
    url: string,
    method: string,
    body?: ArrayBufferView | Blob | string,
    headers?: Headers
  ): void {
    const response = handler(url, method, body, headers);
    xhrio.simulateResponse(response.status, response.body, response.headers);
  }

  return new AuthWrapper(
    null,
    (_1, _2) => {
      return {} as Reference;
    },
    makeRequest,
    {} as Service,
    makePool(newSend)
  );
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
    opt_existing?: StringHeaders
  ): StringHeaders {
    if (opt_existing) {
      opt_existing['X-Goog-Upload-Status'] = status;
      return opt_existing;
    } else {
      return { 'X-Goog-Upload-Status': status };
    }
  }

  function handler(
    url: string,
    method: string,
    content?: ArrayBufferView | Blob | string,
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
    const isUpload = arrayUtils.contains(commands, 'upload');
    const isFinalize = arrayUtils.contains(commands, 'finalize');
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
  it('Works for a small upload w/ an observer', () => {
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
      testLocation,
      mappings,
      smallBlob
    );
    return fbsPromise.make<void>((resolve, reject) => {
      task.on(
        TaskEvent.STATE_CHANGED,
        null,
        error => {
          assert.fail('Unexpected upload failure');
        },
        () => {
          resolve(null);
        }
      );
    });
  });
  it('Works for a small upload w/ a promise', () => {
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
      testLocation,
      mappings,
      smallBlob
    );
    return task.then(snapshot => {
      assert.equal(snapshot.totalBytes, smallBlob.size());
    });
  });
  it('Works for a small upload canceled w/ a promise', () => {
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
      testLocation,
      mappings,
      smallBlob
    );
    const promise: Promise<string> = task.then<string>(
      snapshot => {
        assert.fail('task completed, but should have failed');
        return null;
      },
      err => {
        return 'Task failed as expected';
      }
    );
    task.cancel();
    return promise;
  });
  it('Works properly with multiple observers', () => {
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
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

    // This one will get executed immediately
    const h3: Unsubscribe = (() => {
      let lastState;
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
    })() as Unsubscribe;

    h1();
    h2();

    return fbsPromise.make<void>((resolve, reject) => {
      task.on(
        TaskEvent.STATE_CHANGED,
        null,
        error => {
          assert.fail('Upload failed');
        },
        function() {
          assert.isFalse(badComplete);
          assert.equal(resumed, 1);
          resolve(null);
        }
      );
    });
  });
  it("Works properly with an observer missing the 'next' method", () => {
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
      testLocation,
      mappings,
      smallBlob
    );
    return fbsPromise.make<void>((resolve, reject) => {
      task.on(TaskEvent.STATE_CHANGED, {
        error: err => {
          assert.fail('Unexpected upload failure');
        },
        complete: () => {
          resolve(null);
        }
      });
    });
  });

  function runNormalUploadTest(blob: FbsBlob): Promise<void> {
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
      testLocation,
      mappings,
      blob
    );

    let resolve, reject;
    const promise = fbsPromise.make<void>(function(innerResolve, innerReject) {
      resolve = innerResolve;
      reject = innerReject;
    });

    // Assert functions throw Errors, which means if we're not in the right stack
    // the error might not get reported properly. This function wraps existing
    // assert functions, returning a new function that calls reject with any
    // caught errors. This should make sure errors are reported properly.
    function promiseAssertWrapper<T>(func: T): T {
      function wrapped(...args: any[]): void {
        try {
          ((func as any) as (...args: any[]) => void).apply(null, arguments);
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

    const events = [];
    const progress = [];
    let complete = 0;
    function addCallbacks(task) {
      let lastState;
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
        error => {
          fixedAssertFail('upload failed');
        },
        () => {
          events.push('complete');
          complete++;
        }
      );
    }
    addCallbacks(task);

    (function() {
      let lastState;
      task.on(TaskEvent.STATE_CHANGED, function(snapshot) {
        const state = snapshot.state;
        if (lastState !== TaskState.PAUSED && state === TaskState.PAUSED) {
          events.push('timeout');
          setTimeout(function() {
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
        authWrapper,
        testLocation,
        mappings,
        blob
      );
      const events2 = [];

      (function() {
        let lastState;
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
          error => {
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
    const authWrapper = authWrapperWithHandler(fakeServerHandler());
    const task = new UploadTask(
      {} as Reference,
      authWrapper,
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

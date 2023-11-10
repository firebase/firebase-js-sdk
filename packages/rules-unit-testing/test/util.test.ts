/**
 * @license
 * Copyright 2021 Google LLC
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
import * as sinon from 'sinon';
import {
  assertFails,
  assertSucceeds,
  withFunctionTriggersDisabled
} from '../src/util';
import { restoreEnvVars, stashEnvVars } from './test_utils';

describe('assertSucceeds()', () => {
  it('returns a fulfilled promise iff success', async function () {
    const success = Promise.resolve('success');
    const failure = Promise.reject('failure');
    await assertSucceeds(success).catch(() => {
      throw new Error('Expected success to succeed.');
    });
    await assertSucceeds(failure)
      .then(() => {
        throw new Error('Expected failure to fail.');
      })
      .catch(() => {});
  });
});

describe('assertFails()', () => {
  it('returns a rejected promise if argument promise fulfills', async function () {
    const success = Promise.resolve('success');
    await assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});
  });

  it('returns a fulfilled promise if PERMISSION_DENIED', async function () {
    const permissionDenied = Promise.reject({
      message: 'PERMISSION_DENIED'
    });

    await assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });
  });

  it('returns a fulfilled promise if code is permission-denied', async function () {
    const success = Promise.resolve('success');
    const permissionDenied = Promise.reject({
      code: 'permission-denied'
    });
    const otherFailure = Promise.reject('failure');
    await assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});

    await assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });

    await assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });

  it('resolve if code is PERMISSION_DENIED', async function () {
    const success = Promise.resolve('success');
    const permissionDenied = Promise.reject({
      code: 'PERMISSION_DENIED'
    });
    const otherFailure = Promise.reject('failure');
    await assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});

    await assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });

    await assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });

  it('returns a fulfilled promise if message is Permission denied', async function () {
    const success = Promise.resolve('success');
    const permissionDenied = Promise.reject({
      message: 'Permission denied'
    });
    const otherFailure = Promise.reject('failure');
    await assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});

    await assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });

    await assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });

  it('returns a fulfilled promise if message contains unauthorized', async function () {
    const success = Promise.resolve('success');
    const permissionDenied = Promise.reject({
      message:
        "User does not have permission to access 'file'. (storage/unauthorized)"
    });
    const otherFailure = Promise.reject('failure');
    await assertFails(success)
      .then(() => {
        throw new Error('Expected success to fail.');
      })
      .catch(() => {});

    await assertFails(permissionDenied).catch(() => {
      throw new Error('Expected permissionDenied to succeed.');
    });

    await assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });

  it('returns a rejected promise if argument promise rejects with other errors', async function () {
    const otherFailure = Promise.reject('failure');

    await assertFails(otherFailure)
      .then(() => {
        throw new Error('Expected otherFailure to fail.');
      })
      .catch(() => {});
  });
});

describe('withFunctionTriggersDisabled()', () => {
  it('disabling function triggers does not throw, returns value', async function () {
    const fetchSpy = sinon.spy(require('undici'), 'fetch');

    const res = await withFunctionTriggersDisabled(() => {
      return Promise.resolve(1234);
    });

    expect(res).to.eq(1234);
    expect(fetchSpy.callCount).to.equal(2);
  });

  it('disabling function triggers always re-enables, event when the function throws', async function () {
    const fetchSpy = sinon.spy(require('undici'), 'fetch');

    const res = withFunctionTriggersDisabled(() => {
      throw new Error('I throw!');
    });

    await expect(res).to.eventually.be.rejectedWith('I throw!');
    expect(fetchSpy.callCount).to.equal(2);
  });

  context('without env vars', () => {
    beforeEach(() => {
      stashEnvVars();
    });
    afterEach(() => {
      restoreEnvVars();
    });
    it('throws if hub is not specified', async function () {
      await expect(
        withFunctionTriggersDisabled(() => {
          return Promise.resolve(1234);
        })
      ).to.rejectedWith(/specify the Emulator Hub host and port/);
    });
  });
});

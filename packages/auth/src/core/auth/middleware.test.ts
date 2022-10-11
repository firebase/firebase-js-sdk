/**
 * @license
 * Copyright 2022 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { AuthInternal } from '../../model/auth';
import { User } from '../../model/public_types';
import { AuthMiddlewareQueue } from './middleware';

use(chaiAsPromised);
use(sinonChai);

describe('Auth middleware', () => {
  let middlewareQueue: AuthMiddlewareQueue;
  let user: User;
  let auth: AuthInternal;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid');
    middlewareQueue = new AuthMiddlewareQueue(auth);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls middleware in order', async () => {
    const calls: number[] = [];

    middlewareQueue.pushCallback(() => {
      calls.push(1);
    });
    middlewareQueue.pushCallback(() => {
      calls.push(2);
    });
    middlewareQueue.pushCallback(() => {
      calls.push(3);
    });

    await middlewareQueue.runMiddleware(user);

    expect(calls).to.eql([1, 2, 3]);
  });

  it('rejects on error', async () => {
    middlewareQueue.pushCallback(() => {
      throw new Error('no');
    });
    await expect(middlewareQueue.runMiddleware(user)).to.be.rejectedWith(
      'auth/login-blocked'
    );
  });

  it('rejects on promise rejection', async () => {
    middlewareQueue.pushCallback(() => Promise.reject('no'));
    await expect(middlewareQueue.runMiddleware(user)).to.be.rejectedWith(
      'auth/login-blocked'
    );
  });

  it('awaits middleware completion before calling next', async () => {
    const firstCb = sinon.spy();
    const secondCb = sinon.spy();

    middlewareQueue.pushCallback(() => {
      // Force the first one to run one tick later
      return new Promise(resolve => {
        setTimeout(() => {
          firstCb();
          resolve();
        }, 1);
      });
    });
    middlewareQueue.pushCallback(secondCb);

    await middlewareQueue.runMiddleware(user);
    expect(secondCb).to.have.been.calledAfter(firstCb);
  });

  it('subsequent middleware not run after rejection', async () => {
    const spy = sinon.spy();

    middlewareQueue.pushCallback(() => {
      throw new Error('no');
    });
    middlewareQueue.pushCallback(spy);

    await expect(middlewareQueue.runMiddleware(user)).to.be.rejectedWith(
      'auth/login-blocked'
    );
    expect(spy).not.to.have.been.called;
  });

  it('calls onAbort if provided but only for earlier runs', async () => {
    const firstOnAbort = sinon.spy();
    const secondOnAbort = sinon.spy();

    middlewareQueue.pushCallback(() => {}, firstOnAbort);
    middlewareQueue.pushCallback(() => {
      throw new Error('no');
    }, secondOnAbort);

    await expect(middlewareQueue.runMiddleware(user)).to.be.rejectedWith(
      'auth/login-blocked'
    );
    expect(firstOnAbort).to.have.been.called;
    expect(secondOnAbort).not.to.have.been.called;
  });

  it('calls onAbort in reverse order', async () => {
    const calls: number[] = [];

    middlewareQueue.pushCallback(
      () => {},
      () => {
        calls.push(1);
      }
    );
    middlewareQueue.pushCallback(
      () => {},
      () => {
        calls.push(2);
      }
    );
    middlewareQueue.pushCallback(
      () => {},
      () => {
        calls.push(3);
      }
    );
    middlewareQueue.pushCallback(() => {
      throw new Error('no');
    });

    await expect(middlewareQueue.runMiddleware(user)).to.be.rejectedWith(
      'auth/login-blocked'
    );
    expect(calls).to.eql([3, 2, 1]);
  });

  it('does not call any middleware if user matches null', async () => {
    const spy = sinon.spy();

    middlewareQueue.pushCallback(spy);
    await middlewareQueue.runMiddleware(null);

    expect(spy).not.to.have.been.called;
  });

  it('does not call any middleware if user matches object', async () => {
    const spy = sinon.spy();

    // Directly set it manually since the public function creates a
    // copy of the user.
    auth.currentUser = user;

    middlewareQueue.pushCallback(spy);
    await middlewareQueue.runMiddleware(user);

    expect(spy).not.to.have.been.called;
  });
});

/**
 * @license
 * Copyright 2025 Google LLC
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
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { restore, stub } from 'sinon';
import * as app from '@firebase/app';
import * as crashlytics from './api';
import { FirebaseApp } from '@firebase/app';
import { Crashlytics } from './public-types';
import { nextOnRequestError } from './next';

use(sinonChai);
use(chaiAsPromised);

describe('nextOnRequestError', () => {
  let getCrashlyticsStub: sinon.SinonStub;
  let recordErrorStub: sinon.SinonStub;
  let fakeApp: FirebaseApp;
  let fakeCrashlytics: Crashlytics;

  beforeEach(() => {
    fakeApp = {} as FirebaseApp;
    fakeCrashlytics = {} as Crashlytics;

    stub(app, 'getApp').returns(fakeApp);
    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );
    recordErrorStub = stub(crashlytics, 'recordError');
  });

  afterEach(() => {
    restore();
  });

  it('should capture errors with correct attributes', async () => {
    const error = new Error('test error');
    const errorRequest = {
      path: '/test-path?some=param',
      method: 'GET',
      headers: {}
    };
    const errorContext: {
      routerKind: 'Pages Router';
      routePath: string;
      routeType: 'render';
      revalidateReason: undefined;
    } = {
      routerKind: 'Pages Router',
      routePath: '/test-path',
      routeType: 'render',
      revalidateReason: undefined
    };

    await nextOnRequestError()(error, errorRequest, errorContext);

    expect(getCrashlyticsStub).to.have.been.calledOnceWith(fakeApp);
    expect(recordErrorStub).to.have.been.calledOnceWith(
      fakeCrashlytics,
      error,
      {
        'nextjs_path': '/test-path?some=param',
        'nextjs_method': 'GET',
        'nextjs_router_kind': 'Pages Router',
        'nextjs_route_path': '/test-path',
        'nextjs_route_type': 'render'
      }
    );
  });
});

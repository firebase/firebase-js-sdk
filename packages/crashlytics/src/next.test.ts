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

import * as app from '@firebase/app';
import * as crashlytics from './api';
import { FirebaseApp } from '@firebase/app';
import { Crashlytics } from './public-types';
import { nextOnRequestError } from './next';
import type { MockInstance } from 'vitest';

vi.mock('@firebase/app', async importOriginal => {
  const actual = await importOriginal<typeof import('@firebase/app')>();
  return { ...actual, getApp: vi.fn(actual.getApp) };
});
vi.mock('./api', { spy: true });

describe('nextOnRequestError', () => {
  let getCrashlyticsStub: MockInstance;
  let recordErrorStub: MockInstance;
  let fakeApp: FirebaseApp;
  let fakeCrashlytics: Crashlytics;

  beforeEach(() => {
    fakeApp = {} as FirebaseApp;
    fakeCrashlytics = {} as Crashlytics;

    vi.spyOn(app, 'getApp').mockReturnValue(fakeApp);
    getCrashlyticsStub = vi
      .spyOn(crashlytics, 'getCrashlytics')
      .mockReturnValue(fakeCrashlytics);
    recordErrorStub = vi
      .spyOn(crashlytics, 'recordError')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(getCrashlyticsStub).toHaveBeenCalledExactlyOnceWith(
      fakeApp,
      undefined
    );
    expect(recordErrorStub).toHaveBeenCalledExactlyOnceWith(
      fakeCrashlytics,
      error,
      {
        'app.screen.id': '/test-path',
        'nextjs.path': '/test-path?some=param',
        'nextjs.method': 'GET',
        'nextjs.router_kind': 'Pages Router',
        'nextjs.route_type': 'render'
      }
    );
  });
});

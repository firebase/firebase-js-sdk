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

import 'zone.js';
import 'zone.js/testing';
import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { restore, stub } from 'sinon';
import { FirebaseApp, deleteApp, initializeApp } from '@firebase/app';
import * as crashlytics from '../api';
import {
  Component,
  Injector,
  provideZoneChangeDetection,
  runInInjectionContext
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseErrorHandler } from '.';
import { Crashlytics } from '../public-types';
import { Router, RouterModule } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting
} from '@angular/platform-browser/testing';

use(sinonChai);
use(chaiAsPromised);

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

@Component({ template: '' })
class DummyComponent {}

describe('FirebaseErrorHandler', () => {
  let errorHandler: FirebaseErrorHandler;
  let router: Router;
  let app: FirebaseApp;

  let fakeCrashlytics: Crashlytics;

  let captureErrorStub: sinon.SinonStub;
  let getCrashlyticsStub: sinon.SinonStub;

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: 'fakeapp' });
    fakeCrashlytics = {} as Crashlytics;

    captureErrorStub = stub(crashlytics, 'captureError');
    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(fakeCrashlytics);

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: DummyComponent },
          { path: 'dynamic/:id/route', component: DummyComponent }
        ])
      ],
      providers: [provideZoneChangeDetection()]
    });
    const testInjector = TestBed.inject(Injector);
    errorHandler = runInInjectionContext(
      testInjector,
      () => new FirebaseErrorHandler(app)
    );
    router = TestBed.inject(Router);
  });

  afterEach(async () => {
    restore();
    await deleteApp(app);
  });

  it('should log the error to the console', async () => {
    await router.navigate(['/static-route']);

    const testError = new Error('Test error message');
    errorHandler.handleError(testError);
    expect(getCrashlyticsStub).to.have.been.called;
    expect(captureErrorStub).to.have.been.calledWith(fakeCrashlytics, testError, {
      'angular_route_path': '/static-route'
    });
  });

  it('should remove dynamic content from route', async () => {
    await router.navigate(['/dynamic/my-name/route']);

    const testError = new Error('Test error message');
    errorHandler.handleError(testError);
    expect(captureErrorStub).to.have.been.called;
    expect(captureErrorStub).to.have.been.calledWith(fakeCrashlytics, testError, {
      // eslint-disable-next-line camelcase
      angular_route_path: '/dynamic/:id/route'
    });
  });
});

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
import sinon, { restore, stub } from 'sinon';
import { FirebaseApp, deleteApp, initializeApp } from '@firebase/app';
import * as crashlytics from '../api';
import {
  Component,
  ErrorHandler,
  Injector,
  provideZoneChangeDetection,
  runInInjectionContext
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FirebaseErrorHandler,
  getSafeRoutePath,
  provideCrashlytics
} from '.';
import { Crashlytics } from '../public-types';
import { Router, RouterModule } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting
} from '@angular/platform-browser/testing';
import { AttributesStore } from '../attributes-store';

use(sinonChai);
use(chaiAsPromised);

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

@Component({ template: '' })
class MockComponent {}

describe('FirebaseErrorHandler', () => {
  let errorHandler: FirebaseErrorHandler;
  let app: FirebaseApp;

  let fakeCrashlytics: Crashlytics;
  let attributesStore: AttributesStore;

  let recordErrorStub: sinon.SinonStub;
  let getCrashlyticsStub: sinon.SinonStub;

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: 'fakeapp' });
    attributesStore = new AttributesStore(app.options);
    fakeCrashlytics = {
      attributesStore
    } as unknown as Crashlytics;

    recordErrorStub = stub(crashlytics, 'recordError');
    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: MockComponent },
          { path: 'dynamic/:id/route', component: MockComponent }
        ])
      ],
      providers: [provideZoneChangeDetection()]
    });
    const testInjector = TestBed.inject(Injector);
    errorHandler = runInInjectionContext(
      testInjector,
      () => new FirebaseErrorHandler(app)
    );
  });

  afterEach(async () => {
    restore();
    await deleteApp(app);
  });

  it('should register routePath provider in attributesStore and return correct route path', async () => {
    const setRoutePathProviderSpy = sinon.spy(
      attributesStore,
      'setRoutePathProvider'
    );
    const testInjector = TestBed.inject(Injector);
    runInInjectionContext(testInjector, () => new FirebaseErrorHandler(app));
    expect(setRoutePathProviderSpy).to.have.been.calledWith(sinon.match.func);

    const provider = setRoutePathProviderSpy.firstCall.args[0];
    const router = TestBed.inject(Router);
    await router.navigate(['/static-route']);
    expect(provider).to.not.be.undefined;
    expect(provider!()).to.equal('/static-route');
  });

  it('should log the error to the console', async () => {
    const testError = new Error('Test error message');
    errorHandler.handleError(testError);
    expect(getCrashlyticsStub).to.have.been.called;
    expect(recordErrorStub).to.have.been.calledWith(fakeCrashlytics, testError);
  });
});

describe('provideCrashlytics', () => {
  let app: FirebaseApp;
  let fakeCrashlytics: Crashlytics;
  let attributesStore: AttributesStore;
  let recordErrorStub: sinon.SinonStub;
  let getCrashlyticsStub: sinon.SinonStub;

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: 'fakeapp' });
    attributesStore = new AttributesStore(app.options);
    fakeCrashlytics = {
      attributesStore
    } as unknown as Crashlytics;

    recordErrorStub = stub(crashlytics, 'recordError');
    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );
  });

  afterEach(async () => {
    restore();
    await deleteApp(app);
  });

  it('should eagerly initialize FirebaseErrorHandler and register routePath provider', async () => {
    const setRoutePathProviderSpy = sinon.spy(
      attributesStore,
      'setRoutePathProvider'
    );

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: MockComponent },
          { path: 'dynamic/:id/route', component: MockComponent }
        ])
      ],
      providers: [provideZoneChangeDetection(), provideCrashlytics(() => app)]
    });

    const router = TestBed.inject(Router);
    expect(getCrashlyticsStub).to.have.been.calledWith(app, undefined);
    expect(setRoutePathProviderSpy).to.have.been.calledWith(sinon.match.func);

    await router.navigate(['/static-route']);
    const provider = setRoutePathProviderSpy.firstCall.args[0];
    expect(provider).to.not.be.undefined;
    expect(provider!()).to.equal('/static-route');
  });

  it('should register FirebaseErrorHandler as the Angular ErrorHandler', () => {
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: MockComponent }
        ])
      ],
      providers: [provideZoneChangeDetection(), provideCrashlytics(() => app)]
    });

    const errorHandler = TestBed.inject(ErrorHandler);
    expect(errorHandler).to.be.instanceOf(FirebaseErrorHandler);

    const testError = new Error('Uncaught Angular error');
    errorHandler.handleError(testError);
    expect(recordErrorStub).to.have.been.calledWith(fakeCrashlytics, testError);
  });

  it('should forward CrashlyticsOptions to getCrashlytics', () => {
    const options = { appVersion: '1.2.3' };
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: MockComponent }
        ])
      ],
      providers: [
        provideZoneChangeDetection(),
        provideCrashlytics(() => app, options)
      ]
    });

    TestBed.inject(ErrorHandler);
    expect(getCrashlyticsStub).to.have.been.calledWith(app, options);
  });
});

describe('getSafeRoutePath', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: MockComponent },
          { path: 'dynamic/:id/route', component: MockComponent }
        ])
      ],
      providers: [provideZoneChangeDetection()]
    });
    router = TestBed.inject(Router);
  });

  it('should return the static route path', async () => {
    await router.navigate(['/static-route']);
    expect(getSafeRoutePath(router)).to.equal('/static-route');
  });

  it('should return the parameterized route pattern', async () => {
    await router.navigate(['/dynamic/my-name/route']);
    expect(getSafeRoutePath(router)).to.equal('/dynamic/:id/route');
  });
});

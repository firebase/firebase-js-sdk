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
  DestroyRef,
  Injector,
  provideZoneChangeDetection,
  runInInjectionContext
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FirebaseErrorHandler,
  setupNavigationTracking,
  getSafeRoutePath,
  getRawPath
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
class MockComponent { }

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

  it('should register routePath provider in attributesStore', () => {
    const setRoutePathProviderSpy = sinon.spy(
      attributesStore,
      'setRoutePathProvider'
    );
    const testInjector = TestBed.inject(Injector);
    runInInjectionContext(testInjector, () => new FirebaseErrorHandler(app));
    expect(setRoutePathProviderSpy).to.have.been.calledWith(sinon.match.func);
  });

  it('should log the error to the console', async () => {
    const testError = new Error('Test error message');
    errorHandler.handleError(testError);
    expect(getCrashlyticsStub).to.have.been.called;
    expect(recordErrorStub).to.have.been.calledWith(fakeCrashlytics, testError);
  });
});

describe('getSafeRoutePath', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: DummyComponent },
          { path: 'dynamic/:id/route', component: DummyComponent }
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

describe('getRawPath', () => {
  it('returns the same path if there are no query parameters or hashes', () => {
    expect(getRawPath('/home')).to.equal('/home');
    expect(getRawPath('/users/123/profile')).to.equal('/users/123/profile');
  });

  it('strips query parameters', () => {
    expect(getRawPath('/home?foo=bar')).to.equal('/home');
    expect(getRawPath('/home?foo=bar&baz=qux')).to.equal('/home');
  });

  it('strips hash fragment', () => {
    expect(getRawPath('/home#section1')).to.equal('/home');
  });

  it('strips both query parameters and hash fragment', () => {
    expect(getRawPath('/home?foo=bar#section1')).to.equal('/home');
    expect(getRawPath('/home#section1?foo=bar')).to.equal('/home');
  });
});

describe('setupNavigationTracking', () => {
  let app: FirebaseApp;
  let fakeCrashlytics: Crashlytics;
  let attributesStore: AttributesStore;
  let router: Router;
  let destroyRef: DestroyRef;

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: 'fakeapp' });
    attributesStore = new AttributesStore(app.options);
    fakeCrashlytics = {
      attributesStore,
      loggerProvider: {
        getLogger: () => ({
          emit: () => { }
        })
      }
    } as unknown as Crashlytics;

    stub(crashlytics, 'getCrashlytics').returns(fakeCrashlytics);

    // Set up a real Angular testing module with routes
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'home', component: DummyComponent },
          { path: 'about', component: DummyComponent },
          { path: 'dashboard', component: DummyComponent },
          { path: 'users/:id', component: DummyComponent }
        ])
      ],
      providers: [provideZoneChangeDetection()]
    });

    router = TestBed.inject(Router);
    destroyRef = TestBed.inject(DestroyRef);
  });

  afterEach(async () => {
    restore();
    await deleteApp(app);
  });

  it('should register routePath in attributesStore on initialization and clear registration on destruction', async () => {
    await router.navigate(['/home']);
    setupNavigationTracking(app, router, destroyRef);

    const routePath =
      attributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH];
    expect(routePath).to.equal('/home');

    TestBed.resetTestingModule();

    const routePathAfterUnmount =
      attributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH];
    expect(routePathAfterUnmount).to.be.undefined;
  });

  it('should invoke logViewBoundary on initialization', async () => {
    await router.navigate(['/home']);
    const logViewBoundaryStub = stub(crashlytics, 'logViewBoundary');

    setupNavigationTracking(app, router, destroyRef);

    expect(logViewBoundaryStub).to.have.been.calledWith(
      fakeCrashlytics,
      '/home'
    );
  });

  it('should invoke logViewBoundary with new route pattern if raw path changes', async () => {
    await router.navigate(['/users/123']);
    setupNavigationTracking(app, router, destroyRef);

    const logViewBoundaryStub = stub(crashlytics, 'logViewBoundary');

    await router.navigate(['/users/456']);
    expect(logViewBoundaryStub).to.have.been.calledWith(
      fakeCrashlytics,
      '/users/:id'
    );
  });

  it('should not invoke logViewBoundary if raw path remains the same', async () => {
    await router.navigate(['/home']);
    setupNavigationTracking(app, router, destroyRef);

    const logViewBoundaryStub = stub(crashlytics, 'logViewBoundary');

    await router.navigate(['/home']);

    expect(logViewBoundaryStub).to.not.have.been.called;
  });

  it('should set routePath in attributesStore with new route pattern if raw path changes', async () => {
    await router.navigate(['/home']);
    setupNavigationTracking(app, router, destroyRef);

    await router.navigate(['/about']);

    const routePath =
      attributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH];
    expect(routePath).to.equal('/about');
  });
});

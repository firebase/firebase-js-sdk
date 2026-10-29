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

import { FirebaseApp, deleteApp, initializeApp } from '@firebase/app';
import * as crashlytics from '../api';
import {
  Component,
  DestroyRef,
  ErrorHandler,
  Injector,
  provideExperimentalZonelessChangeDetection,
  runInInjectionContext
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FirebaseErrorHandler,
  setupCrashlyticsRoutes,
  getSafeRoutePath,
  getRawPath,
  provideCrashlytics
} from '.';
import { Crashlytics } from '../public-types';
import { Router, RouterModule } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting
} from '@angular/platform-browser/testing';
import { LOG_ATTR_KEY, AttributesStore } from '../attributes-store';
import type { MockInstance } from 'vitest';

vi.mock('../api', { spy: true });

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

@Component({ template: '' })
class MockComponent {}

describe('FirebaseErrorHandler', () => {
  let errorHandler: FirebaseErrorHandler;
  let app: FirebaseApp;

  let fakeCrashlytics: Crashlytics;
  let attributesStore: AttributesStore;

  let recordErrorStub: MockInstance;
  let getCrashlyticsStub: MockInstance;

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: 'fakeapp' });
    attributesStore = new AttributesStore(app.options);
    fakeCrashlytics = {
      attributesStore
    } as unknown as Crashlytics;

    recordErrorStub = vi
      .spyOn(crashlytics, 'recordError')
      .mockImplementation(() => {});
    getCrashlyticsStub = vi
      .spyOn(crashlytics, 'getCrashlytics')
      .mockReturnValue(fakeCrashlytics);

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'static-route', component: MockComponent },
          { path: 'dynamic/:id/route', component: MockComponent }
        ])
      ],
      providers: [provideExperimentalZonelessChangeDetection()]
    });
    const testInjector = TestBed.inject(Injector);
    errorHandler = runInInjectionContext(
      testInjector,
      () => new FirebaseErrorHandler(app)
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await deleteApp(app);
  });

  it('should register routePath provider in attributesStore and return correct route path', async () => {
    const setRoutePathProviderSpy = vi.spyOn(
      attributesStore,
      'setRoutePathProvider'
    );
    const testInjector = TestBed.inject(Injector);
    runInInjectionContext(testInjector, () => new FirebaseErrorHandler(app));
    expect(setRoutePathProviderSpy).toHaveBeenCalledWith(expect.any(Function));

    const provider = setRoutePathProviderSpy.mock.calls[0][0];
    const router = TestBed.inject(Router);
    await router.navigate(['/static-route']);
    expect(provider).toBeDefined();
    expect(provider!()).toBe('/static-route');
  });

  it('should lazily resolve Router and fall back to "/" if Router is unavailable', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()]
    });

    const setRoutePathProviderSpy = vi.spyOn(
      attributesStore,
      'setRoutePathProvider'
    );
    const testInjector = TestBed.inject(Injector);

    expect(() =>
      runInInjectionContext(testInjector, () => new FirebaseErrorHandler(app))
    ).not.toThrow();

    const provider = setRoutePathProviderSpy.mock.calls[0][0];
    expect(provider).toBeDefined();
    expect(provider!()).toBe('/');
  });

  it('should log the error to the console', async () => {
    const testError = new Error('Test error message');
    errorHandler.handleError(testError);
    expect(getCrashlyticsStub).toHaveBeenCalled();
    expect(recordErrorStub).toHaveBeenCalledWith(fakeCrashlytics, testError);
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
      providers: [provideExperimentalZonelessChangeDetection()]
    });
    router = TestBed.inject(Router);
  });

  it('should return the static route path', async () => {
    await router.navigate(['/static-route']);
    expect(getSafeRoutePath(router)).toBe('/static-route');
  });

  it('should return the parameterized route pattern', async () => {
    await router.navigate(['/dynamic/my-name/route']);
    expect(getSafeRoutePath(router)).toBe('/dynamic/:id/route');
  });
});

describe('getRawPath', () => {
  it('returns the same path if there are no query parameters or hashes', () => {
    expect(getRawPath('/home')).toBe('/home');
    expect(getRawPath('/users/123/profile')).toBe('/users/123/profile');
  });

  it('strips query parameters', () => {
    expect(getRawPath('/home?foo=bar')).toBe('/home');
    expect(getRawPath('/home?foo=bar&baz=qux')).toBe('/home');
  });

  it('strips hash fragment', () => {
    expect(getRawPath('/home#section1')).toBe('/home');
  });

  it('strips matrix parameters', () => {
    expect(getRawPath('/users;id=123;role=admin/profile')).toBe(
      '/users/profile'
    );
    expect(
      getRawPath('/users;id=123/profile;tab=posts/details;view=detailed')
    ).toBe('/users/profile/details');
  });

  it('strips both query parameters and hash fragment', () => {
    expect(getRawPath('/home?foo=bar#section1')).toBe('/home');
    expect(getRawPath('/home#section1?foo=bar')).toBe('/home');
  });

  it('strips query parameters, hash fragments, and matrix parameters combined', () => {
    expect(getRawPath('/users;id=123/profile;tab=posts?foo=bar#section1')).toBe(
      '/users/profile'
    );
  });
});

describe('setupCrashlyticsRoutes', () => {
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
          emit: () => {}
        })
      }
    } as unknown as Crashlytics;

    vi.spyOn(crashlytics, 'getCrashlytics').mockReturnValue(fakeCrashlytics);

    // Set up a real Angular testing module with routes
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'home', component: MockComponent },
          { path: 'about', component: MockComponent },
          { path: 'dashboard', component: MockComponent },
          { path: 'users/:id', component: MockComponent }
        ])
      ],
      providers: [provideExperimentalZonelessChangeDetection()]
    });

    router = TestBed.inject(Router);
    destroyRef = TestBed.inject(DestroyRef);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await deleteApp(app);
  });

  it('should register routePath in attributesStore on initialization and clear registration on destruction', async () => {
    await router.navigate(['/home']);
    setupCrashlyticsRoutes({ firebaseApp: app, router, destroyRef });

    const appScreenId =
      attributesStore.getLogAttributes()[LOG_ATTR_KEY.APP_SCREEN_ID];
    expect(appScreenId).toBe('/home');

    TestBed.resetTestingModule();

    const appScreenIdAfterUnmount =
      attributesStore.getLogAttributes()[LOG_ATTR_KEY.APP_SCREEN_ID];
    expect(appScreenIdAfterUnmount).toBeUndefined();
  });

  it('should invoke logViewBoundary on initialization if the router is set up', async () => {
    await router.navigate(['/home']);
    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {});

    setupCrashlyticsRoutes({ firebaseApp: app, router, destroyRef });

    expect(logViewBoundaryStub).toHaveBeenCalledWith(fakeCrashlytics, '/home');
  });

  it('should not invoke logViewBoundary on initialization if the router is not set up yet', async () => {
    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {});

    setupCrashlyticsRoutes({ firebaseApp: app, router, destroyRef });

    expect(logViewBoundaryStub).not.toHaveBeenCalled();

    await router.navigate(['/home']);

    expect(logViewBoundaryStub).toHaveBeenCalledWith(fakeCrashlytics, '/home');
  });

  it('should invoke logViewBoundary with new route pattern if raw path changes', async () => {
    await router.navigate(['/users/123']);
    setupCrashlyticsRoutes({ firebaseApp: app, router, destroyRef });

    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {})
      .mockClear();

    await router.navigate(['/users/456']);
    expect(logViewBoundaryStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      '/users/:id'
    );
  });

  it('should not invoke logViewBoundary if raw path remains the same', async () => {
    await router.navigate(['/home']);
    setupCrashlyticsRoutes({ firebaseApp: app, router, destroyRef });

    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {})
      .mockClear();

    await router.navigate(['/home']);

    expect(logViewBoundaryStub).not.toHaveBeenCalled();
  });

  it('should set routePath in attributesStore with new route pattern if raw path changes', async () => {
    await router.navigate(['/home']);
    setupCrashlyticsRoutes({ firebaseApp: app, router, destroyRef });

    await router.navigate(['/about']);

    const appScreenId =
      attributesStore.getLogAttributes()[LOG_ATTR_KEY.APP_SCREEN_ID];
    expect(appScreenId).toBe('/about');
  });

  it('should pass crashlyticsOptions to getCrashlytics', () => {
    const getCrashlyticsStub =
      crashlytics.getCrashlytics as unknown as MockInstance;
    const crashlyticsOptions = { appVersion: '2.0.0' };

    setupCrashlyticsRoutes({
      firebaseApp: app,
      router,
      destroyRef,
      crashlyticsOptions
    });

    expect(getCrashlyticsStub).toHaveBeenCalledWith(app, crashlyticsOptions);
  });
});

describe('provideCrashlytics', () => {
  let app: FirebaseApp;
  let fakeCrashlytics: Crashlytics;
  let attributesStore: AttributesStore;

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: 'fakeapp' });
    attributesStore = new AttributesStore(app.options);
    fakeCrashlytics = {
      attributesStore,
      loggerProvider: {
        getLogger: () => ({
          emit: () => {}
        })
      }
    } as unknown as Crashlytics;

    vi.spyOn(crashlytics, 'getCrashlytics').mockReturnValue(fakeCrashlytics);
    vi.spyOn(crashlytics, 'recordError').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await deleteApp(app);
  });

  it('registers FirebaseErrorHandler as Angular ErrorHandler and eagerly initializes it', () => {
    TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([])],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideCrashlytics(() => app)
      ]
    });

    const errorHandler = TestBed.inject(ErrorHandler);
    expect(errorHandler).toBeInstanceOf(FirebaseErrorHandler);
  });

  it('automatically configures route tracking and logs view boundaries on navigation', async () => {
    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {});

    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([
          { path: 'home', component: MockComponent },
          { path: 'users/:id', component: MockComponent }
        ])
      ],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideCrashlytics(() => app)
      ]
    });

    const router = TestBed.inject(Router);
    await router.navigate(['/home']);
    expect(logViewBoundaryStub).toHaveBeenCalledWith(fakeCrashlytics, '/home');

    await router.navigate(['/users/456']);
    expect(logViewBoundaryStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      '/users/:id'
    );
  });

  it('forwards CrashlyticsOptions to getCrashlytics', () => {
    const getCrashlyticsStub =
      crashlytics.getCrashlytics as unknown as MockInstance;
    const options = { appVersion: '3.0.0' };

    TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([])],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideCrashlytics(() => app, options)
      ]
    });

    TestBed.inject(ErrorHandler);
    expect(getCrashlyticsStub).toHaveBeenCalledWith(app, options);
  });
});

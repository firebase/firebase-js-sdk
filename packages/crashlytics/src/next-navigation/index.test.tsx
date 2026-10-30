/**
 * @license
 * Copyright 2026 Google LLC
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

import * as crashlytics from '../api';
import { FirebaseApp } from '@firebase/app';
import { Crashlytics } from '../public-types';
import { CrashlyticsRoutes, getParameterizedRoute } from '.';
import React from 'react';
import { render } from '@testing-library/react';
import { LOG_ATTR_KEY, AttributesStore } from '../attributes-store';
import {
  PathnameContext,
  PathParamsContext
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import type { MockInstance } from 'vitest';

vi.mock('../api', { spy: true });

describe('getParameterizedRoute', () => {
  it('should return "/" if pathname is null or empty', () => {
    expect(getParameterizedRoute(null, {})).toBe('/');
    expect(getParameterizedRoute('', {})).toBe('/');
  });

  it('should return raw pathname if params are empty or null', () => {
    expect(getParameterizedRoute('/users/profile', null)).toBe(
      '/users/profile'
    );
    expect(getParameterizedRoute('/users/profile', {})).toBe('/users/profile');
  });

  it('should ignore params when the value is set to undefined', () => {
    const route = getParameterizedRoute('/users/123/details', {
      id: undefined
    });
    expect(route).toBe('/users/123/details');
  });

  it('should replace dynamic string route parameters with placeholders', () => {
    const route = getParameterizedRoute('/users/123/details', { id: '123' });
    expect(route).toBe('/users/:id/details');
  });

  it('should replace multiple dynamic parameters in pathname', () => {
    const route = getParameterizedRoute('/users/123/posts/456', {
      userId: '123',
      postId: '456'
    });
    expect(route).toBe('/users/:userId/posts/:postId');
  });

  it('should handle catch-all array parameters', () => {
    const route = getParameterizedRoute('/docs/a/b/c', {
      parts: ['a', 'b', 'c']
    });
    expect(route).toBe('/docs/:parts*');
  });

  it('should handle multiple dynamic parameters with the same value', () => {
    const route = getParameterizedRoute('/users/123/compare/123', {
      userId: '123',
      otherUserId: '123'
    });
    expect(route).toBe('/users/:userId/compare/:otherUserId');
  });
});

describe('CrashlyticsRoutes', () => {
  let getCrashlyticsStub: MockInstance;
  let fakeApp: FirebaseApp;
  let fakeAttributesStore: AttributesStore;
  let fakeCrashlytics: Crashlytics;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    fakeAttributesStore = new AttributesStore({ projectId: 'project-id' });
    fakeCrashlytics = {
      app: fakeApp,
      loggerProvider: {
        getLogger: vi.fn().mockReturnValue({
          emit: vi.fn()
        })
      },
      contextManager: {
        setActiveAppScreenId: vi.fn()
      },
      attributesStore: fakeAttributesStore
    } as unknown as Crashlytics;

    getCrashlyticsStub = vi
      .spyOn(crashlytics, 'getCrashlytics')
      .mockReturnValue(fakeCrashlytics);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register routePath in attributesStore on initial mount and clear registration on unmount', () => {
    const { unmount } = render(
      <PathnameContext.Provider value="/initial-path">
        <CrashlyticsRoutes firebaseApp={fakeApp} />
      </PathnameContext.Provider>
    );

    // Check that routePathProvider is set up and returns the active pathname
    const appScreenId =
      fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.APP_SCREEN_ID];
    expect(appScreenId).toBe('/initial-path');

    // Unmount and verify cleanup
    unmount();
    const appScreenIdAfterUnmount =
      fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.APP_SCREEN_ID];
    expect(appScreenIdAfterUnmount).toBeUndefined();
  });

  it('should invoke logViewBoundary on initial mount', () => {
    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {});

    render(
      <PathnameContext.Provider value="/initial-path">
        <CrashlyticsRoutes firebaseApp={fakeApp} />
      </PathnameContext.Provider>
    );

    expect(logViewBoundaryStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      '/initial-path'
    );
  });

  it('should invoke logViewBoundary with new route pattern if pathname or params change', () => {
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={{ id: '123' }}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {})
      .mockClear();

    // Change pathname and params
    rerender(
      <PathnameContext.Provider value="/users/456">
        <PathParamsContext.Provider value={{ id: '456' }}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    expect(logViewBoundaryStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      '/users/:id'
    );
  });

  it('should not invoke logViewBoundary if pathname and params remain the same', () => {
    // Use a stable object reference to simulate Next.js's runtime useParams() memoization
    const params = { id: '123' };
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={params}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {})
      .mockClear();

    rerender(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={params}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    expect(logViewBoundaryStub).not.toHaveBeenCalled();
  });

  it('should set routePath in attributesStore with new route pattern if route pattern changes', () => {
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={{ id: '123' }}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    rerender(
      <PathnameContext.Provider value="/posts/456">
        <PathParamsContext.Provider value={{ postId: '456' }}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const appScreenId =
      fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.APP_SCREEN_ID];
    expect(appScreenId).toBe('/posts/:postId');
  });

  it('should not set routePath in attributesStore when route pattern stays the same', () => {
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={{ id: '123' }}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const setRoutePathProviderSpy = vi.spyOn(
      fakeAttributesStore,
      'setRoutePathProvider'
    );

    rerender(
      <PathnameContext.Provider value="/users/456">
        <PathParamsContext.Provider value={{ id: '456' }}>
          <CrashlyticsRoutes firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    expect(setRoutePathProviderSpy).not.toHaveBeenCalled();
  });
});

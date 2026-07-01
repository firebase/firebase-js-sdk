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

import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import sinon, { restore, stub } from 'sinon';
import * as crashlytics from '../api';
import { FirebaseApp } from '@firebase/app';
import { Crashlytics } from '../public-types';
import { CrashlyticsNavigationTracker, getParameterizedRoute } from '.';
import React from 'react';
import { render } from '@testing-library/react';
import { LOG_ATTR_KEY, AttributesStore } from '../attributes-store';
import {
  PathnameContext,
  PathParamsContext
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

use(sinonChai);
use(chaiAsPromised);

describe('getParameterizedRoute', () => {
  it('should return "/" if pathname is null or empty', () => {
    expect(getParameterizedRoute(null, {})).to.equal('/');
    expect(getParameterizedRoute('', {})).to.equal('/');
  });

  it('should return raw pathname if params are empty or null', () => {
    expect(getParameterizedRoute('/users/profile', null)).to.equal('/users/profile');
    expect(getParameterizedRoute('/users/profile', {})).to.equal('/users/profile');
  });

  it('should replace dynamic string route parameters with placeholders', () => {
    const route = getParameterizedRoute('/users/123/details', { id: '123' });
    expect(route).to.equal('/users/:id/details');
  });

  it('should replace multiple dynamic parameters in pathname', () => {
    const route = getParameterizedRoute('/users/123/posts/456', {
      userId: '123',
      postId: '456'
    });
    expect(route).to.equal('/users/:userId/posts/:postId');
  });

  it('should handle catch-all array parameters', () => {
    const route = getParameterizedRoute('/docs/a/b/c', {
      parts: ['a', 'b', 'c']
    });
    expect(route).to.equal('/docs/:parts*');
  });

  it('should handle multiple dynamic parameters with the same value', () => {
    const route = getParameterizedRoute('/users/123/compare/123', {
      userId: '123',
      otherUserId: '123'
    });
    expect(route).to.equal('/users/:userId/compare/:otherUserId');
  });
});

describe('CrashlyticsNavigationTracker', () => {
  let getCrashlyticsStub: sinon.SinonStub;
  let fakeApp: FirebaseApp;
  let fakeAttributesStore: AttributesStore;
  let fakeCrashlytics: Crashlytics;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    fakeAttributesStore = new AttributesStore({ projectId: 'project-id' });
    fakeCrashlytics = {
      app: fakeApp,
      loggerProvider: {
        getLogger: stub().returns({
          emit: stub()
        })
      },
      contextManager: {
        setActiveAppScreenId: stub()
      },
      attributesStore: fakeAttributesStore
    } as unknown as Crashlytics;

    getCrashlyticsStub = stub(crashlytics, 'getCrashlytics').returns(
      fakeCrashlytics
    );
  });

  afterEach(() => {
    restore();
  });

  it('should register routePath in attributesStore on initial mount and clear registration on unmount', () => {
    const { unmount } = render(
      <PathnameContext.Provider value="/initial-path">
        <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
      </PathnameContext.Provider>
    );

    // Check that routePathProvider is set up and returns the active pathname
    const routePath = fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH];
    expect(routePath).to.equal('/initial-path');

    // Unmount and verify cleanup
    unmount();
    const routePathAfterUnmount = fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH];
    expect(routePathAfterUnmount).to.be.undefined;
  });

  it('should invoke logViewBoundary on initial mount', () => {
    const logViewBoundaryStub = stub(crashlytics, 'logViewBoundary');

    render(
      <PathnameContext.Provider value="/initial-path">
        <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
      </PathnameContext.Provider>
    );

    expect(logViewBoundaryStub).to.have.been.calledWith(
      fakeCrashlytics,
      '/initial-path'
    );
  });

  it('should invoke logViewBoundary with new route pattern if pathname or params change', () => {
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={{ id: '123' }}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const logViewBoundaryStub = stub(crashlytics, 'logViewBoundary');

    // Change pathname and params
    rerender(
      <PathnameContext.Provider value="/users/456">
        <PathParamsContext.Provider value={{ id: '456' }}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    expect(logViewBoundaryStub).to.have.been.calledWith(
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
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const logViewBoundaryStub = stub(crashlytics, 'logViewBoundary');

    rerender(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={params}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    expect(logViewBoundaryStub).to.not.have.been.called;
  });

  it('should set routePath in attributesStore with new route pattern if route pattern changes', () => {
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={{ id: '123' }}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    rerender(
      <PathnameContext.Provider value="/posts/456">
        <PathParamsContext.Provider value={{ postId: '456' }}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const routePath = fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH];
    expect(routePath).to.equal('/posts/:postId');
  });

  it('should not set routePath in attributesStore when route pattern stays the same', () => {
    const { rerender } = render(
      <PathnameContext.Provider value="/users/123">
        <PathParamsContext.Provider value={{ id: '123' }}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    const setRoutePathProviderSpy = sinon.spy(
      fakeAttributesStore,
      'setRoutePathProvider'
    );

    rerender(
      <PathnameContext.Provider value="/users/456">
        <PathParamsContext.Provider value={{ id: '456' }}>
          <CrashlyticsNavigationTracker firebaseApp={fakeApp} />
        </PathParamsContext.Provider>
      </PathnameContext.Provider>
    );

    expect(setRoutePathProviderSpy).to.not.have.been.called;
  });
});

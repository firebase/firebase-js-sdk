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

import * as crashlytics from '../api';
import { FirebaseApp } from '@firebase/app';
import { Crashlytics } from '../public-types';
import { CrashlyticsRoutes } from '.';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, useNavigate } from 'react-router-dom';
import { LOG_ATTR_KEY, AttributesStore } from '../attributes-store';
import type { Mock, MockInstance } from 'vitest';

vi.mock('../api', { spy: true });

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // We can also log here if needed
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}

describe('CrashlyticsRoutes', () => {
  let getCrashlyticsStub: MockInstance;
  let recordErrorStub: MockInstance;
  let logViewBoundaryStub: MockInstance;
  let fakeApp: FirebaseApp;
  let fakeAttributesStore: AttributesStore;
  let fakeCrashlytics: Crashlytics;
  let emitStub: Mock;
  let setActiveAppScreenIdStub: Mock;

  beforeEach(() => {
    fakeApp = { name: 'fakeApp' } as FirebaseApp;
    emitStub = vi.fn();
    setActiveAppScreenIdStub = vi.fn();

    fakeAttributesStore = new AttributesStore({ projectId: 'project-id' });
    fakeCrashlytics = {
      app: fakeApp,
      loggerProvider: {
        getLogger: vi.fn().mockReturnValue({
          emit: emitStub
        })
      },
      contextManager: {
        setActiveAppScreenId: setActiveAppScreenIdStub
      },
      attributesStore: fakeAttributesStore
    } as unknown as Crashlytics;

    getCrashlyticsStub = vi
      .spyOn(crashlytics, 'getCrashlytics')
      .mockReturnValue(fakeCrashlytics);
    recordErrorStub = vi
      .spyOn(crashlytics, 'recordError')
      .mockImplementation(() => {});
    logViewBoundaryStub = vi
      .spyOn(crashlytics, 'logViewBoundary')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const ThrowingComponent = () => {
    throw new Error('render error');
  };

  it('captures render errors in routes and re-throws them', () => {
    // Stub console.error to avoid React error logging in test output
    const consoleErrorStub = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { container } = render(
      <TestErrorBoundary>
        <MemoryRouter>
          <CrashlyticsRoutes firebaseApp={fakeApp}>
            <Route path="/" element={<ThrowingComponent />} />
          </CrashlyticsRoutes>
        </MemoryRouter>
      </TestErrorBoundary>
    );

    // Verify the error was recorded

    expect(getCrashlyticsStub).toHaveBeenCalledWith(fakeApp, undefined);
    expect(recordErrorStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      expect.objectContaining({ message: 'render error' })
    );
    expect(recordErrorStub.mock.calls[0][1]).toBeInstanceOf(Error);
    // Verify the error was caught by our TestErrorBoundary (meaning it was re-thrown)
    // Since TestErrorBoundary returns null on error, container should be empty
    expect(container.firstChild).toBeNull();

    consoleErrorStub.mockRestore();
  });

  it('captures parameterized route pattern and re-throws', () => {
    const consoleErrorStub = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { container } = render(
      <TestErrorBoundary>
        <MemoryRouter initialEntries={['/users/123']}>
          <CrashlyticsRoutes firebaseApp={fakeApp}>
            <Route path="/users/:id" element={<ThrowingComponent />} />
          </CrashlyticsRoutes>
        </MemoryRouter>
      </TestErrorBoundary>
    );

    expect(getCrashlyticsStub).toHaveBeenCalledWith(fakeApp, undefined);
    expect(recordErrorStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      expect.objectContaining({ message: 'render error' })
    );
    expect(recordErrorStub.mock.calls[0][1]).toBeInstanceOf(Error);
    // Verify re-throw
    expect(container.firstChild).toBeNull();

    consoleErrorStub.mockRestore();
  });

  it('filters empty paths and normalizes leading slashes', () => {
    const consoleErrorStub = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { container } = render(
      <TestErrorBoundary>
        <MemoryRouter initialEntries={['/about']}>
          <CrashlyticsRoutes firebaseApp={fakeApp}>
            <Route path="/">
              <Route path="" />
              <Route path="about" element={<ThrowingComponent />} />
            </Route>
          </CrashlyticsRoutes>
        </MemoryRouter>
      </TestErrorBoundary>
    );

    expect(getCrashlyticsStub).toHaveBeenCalledWith(fakeApp, undefined);
    expect(recordErrorStub).toHaveBeenCalledWith(
      fakeCrashlytics,
      expect.objectContaining({ message: 'render error' })
    );
    expect(recordErrorStub.mock.calls[0][1]).toBeInstanceOf(Error);
    // Verify re-throw
    expect(container.firstChild).toBeNull();

    consoleErrorStub.mockRestore();
  });

  it('registers routePath in attributesStore and cleans up on unmount', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/users/123']}>
        <CrashlyticsRoutes firebaseApp={fakeApp}>
          <Route path="/users/:id" element={<div>User Profile</div>} />
        </CrashlyticsRoutes>
      </MemoryRouter>
    );

    expect(
      fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH]
    ).toBe('/users/:id');

    unmount();
    expect(
      fakeAttributesStore.getLogAttributes()[LOG_ATTR_KEY.ROUTE_PATH]
    ).toBeUndefined();
  });

  it('invokes logViewBoundary on mount and on subsequent navigation events', async () => {
    const NavigationTrigger = () => {
      const navigate = useNavigate();
      React.useEffect(() => {
        navigate('/about');
      }, [navigate]);
      return <div>Home</div>;
    };

    const { findByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <CrashlyticsRoutes firebaseApp={fakeApp}>
          <Route path="/" element={<NavigationTrigger />} />
          <Route path="/about" element={<div>About Page</div>} />
        </CrashlyticsRoutes>
      </MemoryRouter>
    );

    await findByText('About Page');

    expect(logViewBoundaryStub).toHaveBeenCalledTimes(2);
    expect(logViewBoundaryStub).toHaveBeenNthCalledWith(
      1,
      fakeCrashlytics,
      '/'
    );
    expect(logViewBoundaryStub).toHaveBeenNthCalledWith(
      2,
      fakeCrashlytics,
      '/about'
    );
  });

  it('invokes logViewBoundary with correct route patterns', async () => {
    const NavigationTrigger = () => {
      const navigate = useNavigate();
      React.useEffect(() => {
        navigate('/users/123');
      }, [navigate]);
      return <div>Home</div>;
    };

    const { findByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <CrashlyticsRoutes firebaseApp={fakeApp}>
          <Route path="/" element={<NavigationTrigger />} />
          <Route path="/users/:id" element={<div>User Profile</div>} />
        </CrashlyticsRoutes>
      </MemoryRouter>
    );

    await findByText('User Profile');

    expect(logViewBoundaryStub).toHaveBeenCalledTimes(2);
    expect(logViewBoundaryStub).toHaveBeenNthCalledWith(
      1,
      fakeCrashlytics,
      '/'
    );
    expect(logViewBoundaryStub).toHaveBeenNthCalledWith(
      2,
      fakeCrashlytics,
      '/users/:id'
    );
  });
});

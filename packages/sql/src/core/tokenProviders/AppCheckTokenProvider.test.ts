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

import {
  FirebaseApp,
  FirebaseOptions,
  FirebaseServerApp,
  FirebaseServerAppSettings,
  _addComponent,
  _getProvider,
  deleteApp,
  getApps,
  initializeServerApp
} from '@firebase/app';
import {
  AppCheckInternalComponentName,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import {
  Component,
  ComponentType,
  InstantiationMode,
  Name,
  Provider
} from '@firebase/component';
import { expect, vi, describe, afterEach, it } from 'vitest';

import { AppCheckProvider } from './AppCheckTokenProvider';

const IS_BROWSER = typeof window !== 'undefined';

function createMockAppCheck(
  overrides: Partial<FirebaseAppCheckInternal> = {}
): FirebaseAppCheckInternal {
  return {
    getToken: vi.fn().mockResolvedValue({ token: 'mock-app-check-token' }),
    addTokenListener: vi.fn(),
    removeTokenListener: vi.fn(),
    ...overrides
  } as FirebaseAppCheckInternal;
}

function registerMockAppCheck(
  app: FirebaseApp,
  appCheckInstance?: FirebaseAppCheckInternal,
  options?: { explicit?: boolean }
): Provider<AppCheckInternalComponentName> {
  if (appCheckInstance) {
    _addComponent(
      app,
      new Component(
        'app-check-internal' as Name,
        () => appCheckInstance as never,
        ComponentType.PRIVATE
      ).setInstantiationMode(
        options?.explicit ? InstantiationMode.EXPLICIT : InstantiationMode.EAGER
      )
    );
  }
  return _getProvider(app, 'app-check-internal');
}

describe('AppCheckProvider', () => {
  afterEach(async () => {
    await Promise.all(getApps().map(existingApp => deleteApp(existingApp)));
  });

  describe.skipIf(IS_BROWSER)('Server Environments (SSR)', () => {
    const serverApps: FirebaseServerApp[] = [];

    afterEach(async () => {
      await Promise.all(serverApps.map(app => deleteApp(app)));
      serverApps.length = 0;
    });

    function createServerApp(
      options: FirebaseOptions,
      settings?: FirebaseServerAppSettings
    ): FirebaseServerApp {
      const app = initializeServerApp(options, settings);
      serverApps.push(app);
      return app;
    }

    function createMockJwt(): string {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const payload =
        typeof Buffer !== 'undefined'
          ? Buffer.from(JSON.stringify({ exp })).toString('base64')
          : btoa(JSON.stringify({ exp }));
      return `header.${payload}.signature`;
    }

    it('resolves static appCheckToken directly from real FirebaseServerApp when no AppCheck component is registered', async () => {
      const jwt = createMockJwt();
      const serverApp = createServerApp(
        {
          apiKey: 'mock-api-key',
          projectId: 'ssr-project'
        },
        {
          appCheckToken: jwt
        }
      );

      const appCheckProvider = _getProvider(serverApp, 'app-check-internal');
      const tokenProvider = new AppCheckProvider(serverApp, appCheckProvider);
      const tokenResult = await tokenProvider.getToken();

      expect(tokenResult).toEqual({ token: jwt });
    });

    it('delegates to appCheck component when AppCheck is registered on FirebaseServerApp', async () => {
      const serverApp = createServerApp(
        {
          apiKey: 'mock-api-key',
          projectId: 'ssr-project'
        },
        {
          appCheckToken: createMockJwt()
        }
      );

      const mockAppCheck = createMockAppCheck({
        getToken: vi.fn().mockResolvedValue({ token: 'live-app-check-token' })
      });
      const appCheckProvider = registerMockAppCheck(serverApp, mockAppCheck);
      const tokenProvider = new AppCheckProvider(serverApp, appCheckProvider);

      const tokenResult = await tokenProvider.getToken();
      expect(tokenResult).toEqual({ token: 'live-app-check-token' });
    });
  });
});

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
  initializeApp,
  initializeServerApp
} from '@firebase/app';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import {
  Component,
  ComponentType,
  InstantiationMode,
  Name,
  Provider
} from '@firebase/component';
import { expect, vi, describe, beforeEach, afterEach, it } from 'vitest';

import { getLogLevel, setLogLevel } from '../../logger';

import { FirebaseAuthProvider } from './FirebaseAuthTokenProvider';

const IS_BROWSER = typeof window !== 'undefined';

function createMockAuth(
  overrides: Partial<FirebaseAuthInternal> = {}
): FirebaseAuthInternal {
  return {
    getToken: vi.fn().mockResolvedValue({ accessToken: 'mock-auth-token' }),
    getUid: vi.fn().mockReturnValue('mock-uid'),
    addAuthTokenListener: vi.fn(),
    removeAuthTokenListener: vi.fn(),
    ...overrides
  } as FirebaseAuthInternal;
}

function registerMockAuth(
  app: FirebaseApp,
  authInstance?: FirebaseAuthInternal,
  options?: { explicit?: boolean }
): Provider<FirebaseAuthInternalName> {
  if (authInstance) {
    _addComponent(
      app,
      new Component(
        'auth-internal' as Name,
        () => authInstance as never,
        ComponentType.PRIVATE
      ).setInstantiationMode(
        options?.explicit ? InstantiationMode.EXPLICIT : InstantiationMode.EAGER
      )
    );
  }
  return _getProvider(app, 'auth-internal');
}

describe('FirebaseAuthProvider', () => {
  let browserApp: FirebaseApp;

  beforeEach(() => {
    browserApp = initializeApp({ projectId: 'test-project' });
  });

  afterEach(async () => {
    await Promise.all(getApps().map(existingApp => deleteApp(existingApp)));
  });

  it('returns null when auth.getToken rejects with auth/token-not-initialized', async () => {
    const mockAuth = createMockAuth({
      getToken: vi
        .fn()
        .mockRejectedValue({ code: 'auth/token-not-initialized' })
    });
    const provider = registerMockAuth(browserApp, mockAuth);
    const tokenProvider = new FirebaseAuthProvider(browserApp, provider);

    await expect(tokenProvider.getToken()).resolves.toBeNull();
  });

  it.each([
    ['auth/token-not-initialized', 'auth/token-not-initialized'],
    ['errors other than auth/token-not-intiailized', 'network-error']
  ])(
    're-throws other errors when auth.getToken rejects with %s',
    async (_, errorCode: string) => {
      const logLevel = getLogLevel();
      try {
        setLogLevel('silent');
        const mockAuth = createMockAuth({
          getToken: vi.fn().mockRejectedValue(new Error(errorCode))
        });
        const provider = registerMockAuth(browserApp, mockAuth);
        const tokenProvider = new FirebaseAuthProvider(browserApp, provider);
        await expect(tokenProvider.getToken()).rejects.toThrow(errorCode);
      } finally {
        setLogLevel(logLevel);
      }
    }
  );

  it('resets in-flight request and allows retry when auth.getToken rejects with any error', async () => {
    const logLevel = getLogLevel();
    try {
      setLogLevel('silent');
      const mockAuth = createMockAuth({
        getToken: vi
          .fn()
          .mockRejectedValueOnce(new Error('network-timeout'))
          .mockResolvedValue({ accessToken: 'recovered-auth-token' })
      });
      const provider = registerMockAuth(browserApp, mockAuth);
      const tokenProvider = new FirebaseAuthProvider(browserApp, provider);

      await expect(tokenProvider.getToken()).rejects.toThrow('network-timeout');

      const recoveredToken = await tokenProvider.getToken();
      expect(recoveredToken).toEqual({ accessToken: 'recovered-auth-token' });
      expect(mockAuth.getToken).toHaveBeenCalledTimes(2);
    } finally {
      setLogLevel(logLevel);
    }
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

    it('resolves static authIdToken directly from real FirebaseServerApp when no Auth component is registered', async () => {
      const jwt = createMockJwt();
      const serverApp = createServerApp(
        {
          apiKey: 'mock-api-key',
          projectId: 'ssr-project'
        },
        {
          authIdToken: jwt
        }
      );

      const authProvider = _getProvider(serverApp, 'auth-internal');
      const tokenProvider = new FirebaseAuthProvider(serverApp, authProvider);
      const tokenData = await tokenProvider.getToken();

      expect(tokenData).toEqual({ accessToken: jwt });
    });

    it('delegates to auth component when Auth is registered on FirebaseServerApp', async () => {
      const serverApp = createServerApp(
        {
          apiKey: 'mock-api-key',
          projectId: 'ssr-project'
        },
        {
          authIdToken: createMockJwt()
        }
      );

      const mockAuth = createMockAuth({
        getToken: vi.fn().mockResolvedValue({ accessToken: 'live-auth-token' })
      });
      const authProvider = registerMockAuth(serverApp, mockAuth);
      const tokenProvider = new FirebaseAuthProvider(serverApp, authProvider);

      const tokenData = await tokenProvider.getToken();
      expect(tokenData).toEqual({ accessToken: 'live-auth-token' });
    });
  });
});

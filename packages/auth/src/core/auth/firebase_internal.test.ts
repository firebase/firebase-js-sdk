/**
 * @license
 * Copyright 2020 Google LLC
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

import { FirebaseError } from '@firebase/util';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { AuthInternal } from '../../model/auth';
import { UserInternal } from '../../model/user';
import { AuthInterop } from './firebase_internal';
describe('core/auth/firebase_internal', () => {
  let auth: AuthInternal;
  let authInternal: AuthInterop;
  beforeEach(async () => {
    auth = await testAuth();
    authInternal = new AuthInterop(auth);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUid', () => {
    it('returns null if currentUser is undefined', () => {
      expect(authInternal.getUid()).toBeNull();
    });

    it('returns the uid of the user if set', async () => {
      const user = testUser(auth, 'uid');
      await auth._updateCurrentUser(user);
      expect(authInternal.getUid()).toBe('uid');
    });

    it('errors if Auth is not initialized', () => {
      delete (auth as unknown as Record<string, unknown>)[
        '_initializationPromise'
      ];
      expect(() => authInternal.getUid()).toThrow(
        FirebaseError,
        'auth/dependent-sdk-initialized-before-auth'
      );
    });
  });

  describe('getToken', () => {
    it('returns null if currentUser is undefined', async () => {
      expect(await authInternal.getToken()).toBeNull();
    });

    it('returns the id token of the current user correctly', async () => {
      const user = testUser(auth, 'uid');
      await auth._updateCurrentUser(user);
      user.stsTokenManager.accessToken = 'access-token';
      user.stsTokenManager.refreshToken = 'refresh-token';
      user.stsTokenManager.expirationTime = Date.now() + 1000 * 60 * 60 * 24;
      expect(await authInternal.getToken()).toEqual({
        accessToken: 'access-token'
      });
    });

    it('errors if Auth is not initialized', async () => {
      delete (auth as unknown as Record<string, unknown>)[
        '_initializationPromise'
      ];
      await expect(authInternal.getToken()).rejects.toThrow(
        FirebaseError,
        'auth/dependent-sdk-initialized-before-auth'
      );
    });
  });

  describe('token listeners', () => {
    let isProactiveRefresh = false;
    let user: UserInternal;

    beforeEach(async () => {
      user = testUser(auth, 'uid', undefined, true);
      await auth._updateCurrentUser(user);
      let i = 0;
      vi.spyOn(user.stsTokenManager, 'getToken').mockImplementation(
        async () => {
          i += 1;
          return `new-access-token-${i}`;
        }
      );
      vi.spyOn(user, '_startProactiveRefresh').mockImplementation(
        () => (isProactiveRefresh = true)
      );
      vi.spyOn(user, '_stopProactiveRefresh').mockImplementation(
        () => (isProactiveRefresh = false)
      );
    });

    describe('addAuthTokenListener', () => {
      it('gets called with the token, starts proactive refresh', done => {
        // The listener always fires first time. Ignore that one
        let firstCall = true;
        authInternal.addAuthTokenListener(token => {
          if (firstCall) {
            firstCall = false;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            user.getIdToken(true);
            return;
          }

          expect(token).toBe('access-token');
          expect(isProactiveRefresh).toBe(true);
          done();
        });
      });

      it('gets called on subsequent updates', async () => {
        let tokenCount = 0;
        authInternal.addAuthTokenListener(() => {
          tokenCount++;
        });

        await user.getIdToken(true);
        await user.getIdToken(true);
        await user.getIdToken(true);
        await user.getIdToken(true);

        expect(tokenCount).toBe(5);
      });

      it('errors if Auth is not initialized', () => {
        delete (auth as unknown as Record<string, unknown>)[
          '_initializationPromise'
        ];
        expect(() => authInternal.addAuthTokenListener(() => {})).toThrow(
          FirebaseError,
          'auth/dependent-sdk-initialized-before-auth'
        );
      });
    });

    describe('removeAuthTokenListener', () => {
      it('listeners no longer receive token updates', async () => {
        let tokenCount = 0;
        function listener(): void {
          tokenCount++;
        }
        authInternal.addAuthTokenListener(listener);

        await user.getIdToken(true);
        expect(tokenCount).toBe(2);
        authInternal.removeAuthTokenListener(listener);
        await user.getIdToken(true);
        await user.getIdToken(true);
        await user.getIdToken(true);
        expect(tokenCount).toBe(2);
      });

      it('toggles proactive refresh when listeners fall to 0', () => {
        function listenerA(): void {}

        authInternal.addAuthTokenListener(listenerA);
        expect(isProactiveRefresh).toBe(true);
        authInternal.removeAuthTokenListener(listenerA);
        expect(isProactiveRefresh).toBe(false);
      });

      it('toggles proactive refresh when single listener subbed twice', () => {
        function listenerA(): void {}

        authInternal.addAuthTokenListener(listenerA);
        authInternal.addAuthTokenListener(listenerA);
        expect(isProactiveRefresh).toBe(true);
        authInternal.removeAuthTokenListener(listenerA);
        expect(isProactiveRefresh).toBe(false);
      });

      it('toggles proactive refresh properly multiple listeners', () => {
        function listenerA(): void {}
        function listenerB(): void {}

        authInternal.addAuthTokenListener(listenerA);
        authInternal.addAuthTokenListener(listenerB);
        expect(isProactiveRefresh).toBe(true);
        authInternal.removeAuthTokenListener(listenerA);
        expect(isProactiveRefresh).toBe(true);
        authInternal.removeAuthTokenListener(listenerB);
        expect(isProactiveRefresh).toBe(false);

        authInternal.addAuthTokenListener(listenerB);
        expect(isProactiveRefresh).toBe(true);
      });

      it('errors if Auth is not initialized', () => {
        delete (auth as unknown as Record<string, unknown>)[
          '_initializationPromise'
        ];
        expect(() => authInternal.removeAuthTokenListener(() => {})).toThrow(
          FirebaseError,
          'auth/dependent-sdk-initialized-before-auth'
        );
      });
    });
  });
});

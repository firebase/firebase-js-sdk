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

import { FirebaseApp, _isFirebaseServerApp } from '@firebase/app';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import { logDebug, logError } from '../../logger';

import {
  AbstractTokenProvider,
  TokenOptions,
  TokenProvider
} from './AbstractTokenProvider';

/** @internal */
export interface FirebaseAuthTokenProvider extends TokenProvider<
  FirebaseAuthTokenData,
  AuthTokenListener
> {
  getAuth(): FirebaseAuthInternal | undefined;
}

/** @internal */
export type AuthTokenListener = (token: string | null) => void;

/**
 * Auth Token Provider backed by the `@firebase/auth-interop-types` component
 * or a `FirebaseServerApp` static `authIdToken`.
 * @internal
 */
export class FirebaseAuthProvider
  extends AbstractTokenProvider<
    FirebaseAuthTokenData,
    FirebaseAuthInternal,
    AuthTokenListener,
    FirebaseAuthInternalName
  >
  implements FirebaseAuthTokenProvider
{
  constructor(
    app: FirebaseApp,
    authInternalProvider: Provider<FirebaseAuthInternalName> | undefined
  ) {
    const serverAppToken = _isFirebaseServerApp(app)
      ? app.settings.authIdToken
      : undefined;
    super(authInternalProvider, serverAppToken);
  }

  getAuth(): FirebaseAuthInternal | undefined {
    return this.component;
  }

  protected convertServerAppToken(token: string): FirebaseAuthTokenData {
    return { accessToken: token };
  }

  protected fetchToken(
    component: FirebaseAuthInternal,
    options: TokenOptions = { forceRefresh: false }
  ): Promise<FirebaseAuthTokenData | null> {
    return component.getToken(options.forceRefresh).catch((error: unknown) => {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'auth/token-not-initialized'
      ) {
        logDebug(
          'Got auth/token-not-initialized error. Treating as null token.'
        );
        return null;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError('Error received when attempting to retrieve token: ' + errorMsg);
      return Promise.reject(error);
    });
  }

  protected addListener(
    component: FirebaseAuthInternal,
    listener: AuthTokenListener
  ): void {
    component.addAuthTokenListener(listener);
  }

  protected removeListener(
    component: FirebaseAuthInternal,
    listener: AuthTokenListener
  ): void {
    component.removeAuthTokenListener(listener);
  }
}

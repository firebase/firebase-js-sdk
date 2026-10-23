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
  AppCheckInternalComponentName,
  AppCheckTokenListener,
  AppCheckTokenResult,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import { Provider } from '@firebase/component';

import {
  AbstractTokenProvider,
  TokenOptions,
  TokenProvider
} from './AbstractTokenProvider';

/** @internal */
export interface AppCheckTokenProvider extends TokenProvider<
  AppCheckTokenResult,
  AppCheckTokenListener
> {}

/**
 * App Check Provider backed by the `@firebase/app-check-interop-types` component
 * or a `FirebaseServerApp` static `appCheckToken`.
 * @internal
 */
export class AppCheckProvider
  extends AbstractTokenProvider<
    AppCheckTokenResult,
    FirebaseAppCheckInternal,
    AppCheckTokenListener,
    AppCheckInternalComponentName
  >
  implements AppCheckTokenProvider
{
  constructor(
    app: FirebaseApp,
    appCheckInternalProvider:
      Provider<AppCheckInternalComponentName> | undefined
  ) {
    const serverAppToken = _isFirebaseServerApp(app)
      ? app.settings.appCheckToken
      : undefined;
    super(appCheckInternalProvider, serverAppToken);
  }

  protected convertServerAppToken(token: string): AppCheckTokenResult {
    return { token };
  }

  protected fetchToken(
    component: FirebaseAppCheckInternal,
    options: TokenOptions = { forceRefresh: false }
  ): Promise<AppCheckTokenResult | null> {
    return component.getToken(options.forceRefresh);
  }

  protected addListener(
    component: FirebaseAppCheckInternal,
    listener: AppCheckTokenListener
  ): void {
    component.addTokenListener(listener);
  }

  protected removeListener(
    component: FirebaseAppCheckInternal,
    listener: AppCheckTokenListener
  ): void {
    component.removeTokenListener(listener);
  }
}

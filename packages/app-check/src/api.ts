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

import {
  AppCheckProvider,
  AppCheckTokenResult
} from '@firebase/app-check-types';
import { FirebaseApp } from '@firebase/app-types';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { getState, setState, AppCheckState, ListenerType } from './state';
import {
  getToken as getTokenInternal,
  addTokenListener,
  removeTokenListener,
  isValid
} from './internal-api';
import { Provider } from '@firebase/component';
import { ErrorFn, NextFn, PartialObserver, Unsubscribe } from '@firebase/util';
import { CustomProvider, ReCaptchaV3Provider } from './providers';
import { readTokenFromStorage } from './storage';

/**
 *
 * @param app
 * @param siteKeyOrProvider - optional custom attestation provider
 * or reCAPTCHA provider
 * @param isTokenAutoRefreshEnabled - if true, enables auto refresh
 * of appCheck token.
 */
export function activate(
  app: FirebaseApp,
  siteKeyOrProvider:
    | ReCaptchaV3Provider
    | CustomProvider
    // This is the old interface for users to supply a custom provider.
    | AppCheckProvider
    | string,
  platformLoggerProvider: Provider<'platform-logger'>,
  isTokenAutoRefreshEnabled?: boolean
): void {
  const state = getState(app);
  if (state.activated) {
    throw ERROR_FACTORY.create(AppCheckError.ALREADY_ACTIVATED, {
      appName: app.name
    });
  }

  const newState: AppCheckState = { ...state, activated: true };

  // Read cached token from storage if it exists and store it in memory.
  newState.cachedTokenPromise = readTokenFromStorage(app).then(cachedToken => {
    if (cachedToken && isValid(cachedToken)) {
      setState(app, { ...getState(app), token: cachedToken });
    }
    return cachedToken;
  });

  if (typeof siteKeyOrProvider === 'string') {
    newState.provider = new ReCaptchaV3Provider(siteKeyOrProvider);
  } else if (
    siteKeyOrProvider instanceof ReCaptchaV3Provider ||
    siteKeyOrProvider instanceof CustomProvider
  ) {
    newState.provider = siteKeyOrProvider;
  } else {
    // Process "old" custom provider to avoid breaking previous users.
    // This was defined at beta release as simply an object with a
    // getToken() method.
    newState.provider = new CustomProvider({
      getToken: siteKeyOrProvider.getToken
    });
  }

  // Use value of global `automaticDataCollectionEnabled` (which
  // itself defaults to false if not specified in config) if
  // `isTokenAutoRefreshEnabled` param was not provided by user.
  newState.isTokenAutoRefreshEnabled =
    isTokenAutoRefreshEnabled === undefined
      ? app.automaticDataCollectionEnabled
      : isTokenAutoRefreshEnabled;

  setState(app, newState);

  newState.provider.initialize(app, platformLoggerProvider);
}

export function setTokenAutoRefreshEnabled(
  app: FirebaseApp,
  isTokenAutoRefreshEnabled: boolean
): void {
  const state = getState(app);
  // This will exist if any product libraries have called
  // `addTokenListener()`
  if (state.tokenRefresher) {
    if (isTokenAutoRefreshEnabled === true) {
      state.tokenRefresher.start();
    } else {
      state.tokenRefresher.stop();
    }
  }
  setState(app, { ...state, isTokenAutoRefreshEnabled });
}

/**
 * Differs from internal getToken in that it throws the error.
 */
export async function getToken(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>,
  forceRefresh?: boolean
): Promise<AppCheckTokenResult> {
  const result = await getTokenInternal(
    app,
    platformLoggerProvider,
    forceRefresh
  );
  if (result.error) {
    throw result.error;
  }
  return { token: result.token };
}

/**
 * Wraps addTokenListener/removeTokenListener methods in an Observer
 * pattern for public use.
 */
export function onTokenChanged(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>,
  observer: PartialObserver<AppCheckTokenResult>
): Unsubscribe;
export function onTokenChanged(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>,
  onNext: (tokenResult: AppCheckTokenResult) => void,
  onError?: (error: Error) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onTokenChanged(
  app: FirebaseApp,
  platformLoggerProvider: Provider<'platform-logger'>,
  onNextOrObserver:
    | ((tokenResult: AppCheckTokenResult) => void)
    | PartialObserver<AppCheckTokenResult>,
  onError?: (error: Error) => void,
  /**
   * NOTE: Although an `onCompletion` callback can be provided, it will
   * never be called because the token stream is never-ending.
   * It is added only for API consistency with the observer pattern, which
   * we follow in JS APIs.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCompletion?: () => void
): Unsubscribe {
  let nextFn: NextFn<AppCheckTokenResult> = () => {};
  let errorFn: ErrorFn = () => {};
  if ((onNextOrObserver as PartialObserver<AppCheckTokenResult>).next != null) {
    nextFn = (
      onNextOrObserver as PartialObserver<AppCheckTokenResult>
    ).next!.bind(onNextOrObserver);
  } else {
    nextFn = onNextOrObserver as NextFn<AppCheckTokenResult>;
  }
  if (
    (onNextOrObserver as PartialObserver<AppCheckTokenResult>).error != null
  ) {
    errorFn = (
      onNextOrObserver as PartialObserver<AppCheckTokenResult>
    ).error!.bind(onNextOrObserver);
  } else if (onError) {
    errorFn = onError;
  }
  addTokenListener(
    app,
    platformLoggerProvider,
    ListenerType.EXTERNAL,
    nextFn,
    errorFn
  );
  return () => removeTokenListener(app, nextFn);
}

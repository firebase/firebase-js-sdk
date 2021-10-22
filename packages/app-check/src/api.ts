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
  AppCheck,
  AppCheckOptions,
  AppCheckTokenResult,
  Unsubscribe,
  PartialObserver
} from './public-types';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { getState, setState, AppCheckState, getDebugState } from './state';
import { FirebaseApp, getApp, _getProvider } from '@firebase/app';
import { getModularInstance, ErrorFn, NextFn } from '@firebase/util';
import { AppCheckService } from './factory';
import { AppCheckProvider, ListenerType } from './types';
import {
  getToken as getTokenInternal,
  addTokenListener,
  removeTokenListener,
  isValid
} from './internal-api';
import { readTokenFromStorage } from './storage';
import { getDebugToken, initializeDebugMode, isDebugMode } from './debug';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-check': AppCheckService;
  }
}

export {
  ReCaptchaV3Provider,
  CustomProvider,
  ReCaptchaEnterpriseProvider
} from './providers';

/**
 * Activate App Check for the given app. Can be called only once per app.
 * @param app - the {@link @firebase/app#FirebaseApp} to activate App Check for
 * @param options - App Check initialization options
 * @public
 */
export function initializeAppCheck(
  app: FirebaseApp = getApp(),
  options: AppCheckOptions
): AppCheck {
  app = getModularInstance(app);
  const provider = _getProvider(app, 'app-check');

  // Ensure initializeDebugMode() is only called once.
  if (!getDebugState().initialized) {
    initializeDebugMode();
  }

  // Log a message containing the debug token when `initializeAppCheck()`
  // is called in debug mode.
  if (isDebugMode()) {
    // Do not block initialization to get the token for the message.
    void getDebugToken().then(token =>
      // Not using logger because I don't think we ever want this accidentally hidden.
      console.log(
        `App Check debug token: ${token}. You will need to add it to your app's App Check settings in the Firebase console for it to work.`
      )
    );
  }

  if (provider.isInitialized()) {
    const existingInstance = provider.getImmediate();
    const initialOptions = provider.getOptions() as unknown as AppCheckOptions;
    if (
      initialOptions.isTokenAutoRefreshEnabled ===
        options.isTokenAutoRefreshEnabled &&
      initialOptions.provider.isEqual(options.provider)
    ) {
      return existingInstance;
    } else {
      throw ERROR_FACTORY.create(AppCheckError.ALREADY_INITIALIZED, {
        appName: app.name
      });
    }
  }

  const appCheck = provider.initialize({ options });
  _activate(app, options.provider, options.isTokenAutoRefreshEnabled);
  // Adding a listener will start the refresher and fetch a token if needed.
  // This gets a token ready and prevents a delay when an internal library
  // requests the token.
  // Listener function does not need to do anything, its base functionality
  // of calling getToken() already fetches token and writes it to memory/storage.
  addTokenListener(appCheck, ListenerType.INTERNAL, () => {});

  return appCheck;
}

/**
 * Activate App Check
 * @param app - Firebase app to activate App Check for.
 * @param provider - reCAPTCHA v3 provider or
 * custom token provider.
 * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
 * refreshes App Check tokens as needed. If undefined, defaults to the
 * value of `app.automaticDataCollectionEnabled`, which defaults to
 * false and can be set in the app config.
 */
function _activate(
  app: FirebaseApp,
  provider: AppCheckProvider,
  isTokenAutoRefreshEnabled?: boolean
): void {
  const state = getState(app);

  const newState: AppCheckState = { ...state, activated: true };
  newState.provider = provider; // Read cached token from storage if it exists and store it in memory.
  newState.cachedTokenPromise = readTokenFromStorage(app).then(cachedToken => {
    if (cachedToken && isValid(cachedToken)) {
      setState(app, { ...getState(app), token: cachedToken });
    }
    return cachedToken;
  });

  // Use value of global `automaticDataCollectionEnabled` (which
  // itself defaults to false if not specified in config) if
  // `isTokenAutoRefreshEnabled` param was not provided by user.
  newState.isTokenAutoRefreshEnabled =
    isTokenAutoRefreshEnabled === undefined
      ? app.automaticDataCollectionEnabled
      : isTokenAutoRefreshEnabled;

  setState(app, newState);

  newState.provider.initialize(app);
}

/**
 * Set whether App Check will automatically refresh tokens as needed.
 *
 * @param appCheckInstance - The App Check service instance.
 * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
 * refreshes App Check tokens as needed. This overrides any value set
 * during `initializeAppCheck()`.
 * @public
 */
export function setTokenAutoRefreshEnabled(
  appCheckInstance: AppCheck,
  isTokenAutoRefreshEnabled: boolean
): void {
  const app = appCheckInstance.app;
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
 * Get the current App Check token. Attaches to the most recent
 * in-flight request if one is present. Returns null if no token
 * is present and no token requests are in-flight.
 *
 * @param appCheckInstance - The App Check service instance.
 * @param forceRefresh - If true, will always try to fetch a fresh token.
 * If false, will use a cached token if found in storage.
 * @public
 */
export async function getToken(
  appCheckInstance: AppCheck,
  forceRefresh?: boolean
): Promise<AppCheckTokenResult> {
  const result = await getTokenInternal(
    appCheckInstance as AppCheckService,
    forceRefresh
  );
  if (result.error) {
    throw result.error;
  }
  return { token: result.token };
}

/**
 * Registers a listener to changes in the token state. There can be more
 * than one listener registered at the same time for one or more
 * App Check instances. The listeners call back on the UI thread whenever
 * the current token associated with this App Check instance changes.
 *
 * @param appCheckInstance - The App Check service instance.
 * @param observer - An object with `next`, `error`, and `complete`
 * properties. `next` is called with an
 * {@link AppCheckTokenResult}
 * whenever the token changes. `error` is optional and is called if an
 * error is thrown by the listener (the `next` function). `complete`
 * is unused, as the token stream is unending.
 *
 * @returns A function that unsubscribes this listener.
 * @public
 */
export function onTokenChanged(
  appCheckInstance: AppCheck,
  observer: PartialObserver<AppCheckTokenResult>
): Unsubscribe;
/**
 * Registers a listener to changes in the token state. There can be more
 * than one listener registered at the same time for one or more
 * App Check instances. The listeners call back on the UI thread whenever
 * the current token associated with this App Check instance changes.
 *
 * @param appCheckInstance - The App Check service instance.
 * @param onNext - When the token changes, this function is called with aa
 * {@link AppCheckTokenResult}.
 * @param onError - Optional. Called if there is an error thrown by the
 * listener (the `onNext` function).
 * @param onCompletion - Currently unused, as the token stream is unending.
 * @returns A function that unsubscribes this listener.
 * @public
 */
export function onTokenChanged(
  appCheckInstance: AppCheck,
  onNext: (tokenResult: AppCheckTokenResult) => void,
  onError?: (error: Error) => void,
  onCompletion?: () => void
): Unsubscribe;
/**
 * Wraps `addTokenListener`/`removeTokenListener` methods in an `Observer`
 * pattern for public use.
 */
export function onTokenChanged(
  appCheckInstance: AppCheck,
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
    appCheckInstance as AppCheckService,
    ListenerType.EXTERNAL,
    nextFn,
    errorFn
  );
  return () => removeTokenListener(appCheckInstance.app, nextFn);
}

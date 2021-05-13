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

import { AppCheck, AppCheckOptions, AppCheckProvider } from './public-types';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { initialize as initializeRecaptcha } from './recaptcha';
import { getState, setState, AppCheckState } from './state';
import { FirebaseApp, getApp, _getProvider } from '@firebase/app-exp';
import { getModularInstance } from '@firebase/util';
import { AppCheckService } from './factory';
import { ReCaptchaV3Provider } from './providers';
import { Provider } from '@firebase/component';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-check-exp': AppCheckService;
  }
}

/**
 * Activate AppCheck for the given app. Can be called only once per app.
 * @param app - the FirebaseApp to activate AppCheck for
 * @param options - Provider implementation that can return an AppCheck token
 * @public
 */
export function initializeAppCheck(
  app: FirebaseApp = getApp(),
  options: AppCheckOptions
): AppCheck {
  app = getModularInstance(app);
  const provider = _getProvider(app, 'app-check-exp');
  const platformLoggerProvider = _getProvider(app, 'platform-logger');

  if (provider.isInitialized()) {
    throw ERROR_FACTORY.create(AppCheckError.ALREADY_INITIALIZED, {
      appName: app.name
    });
  }

  const appCheck = provider.initialize({ options });
  _activate(
    app,
    options.provider,
    platformLoggerProvider,
    options.isTokenAutoRefreshEnabled
  );

  return appCheck;
}

/**
 * Activate AppCheck
 * @param app - Firebase app to activate AppCheck for.
 * @param provider - reCAPTCHA v3 provider or
 * custom token provider.
 * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
 * refreshes App Check tokens as needed. If undefined, defaults to the
 * value of `app.automaticDataCollectionEnabled`, which defaults to
 * false and can be set in the app config.
 *
 * @internal
 */
export function _activate(
  app: FirebaseApp,
  provider: AppCheckProvider,
  platformLoggerProvider: Provider<'platform-logger'>,
  isTokenAutoRefreshEnabled?: boolean
): void {
  const state = getState(app);

  const newState: AppCheckState = { ...state, activated: true };
  newState.provider = provider;

  // Use value of global `automaticDataCollectionEnabled` (which
  // itself defaults to false if not specified in config) if
  // `isTokenAutoRefreshEnabled` param was not provided by user.
  newState.isTokenAutoRefreshEnabled =
    isTokenAutoRefreshEnabled === undefined
      ? app.automaticDataCollectionEnabled
      : isTokenAutoRefreshEnabled;

  setState(app, newState);

  // initialize reCAPTCHA if siteKey is provided
  if (newState.provider instanceof ReCaptchaV3Provider) {
    const providerImpl = newState.provider._delegate;
    setState(app, { ...newState, provider: providerImpl });
    // These need to be injected for ReCaptchaV3Provider's getToken() to work.
    providerImpl.initialize(app, platformLoggerProvider);
    initializeRecaptcha(app, providerImpl.siteKey).catch(() => {
      /* we don't care about the initialization result in activate() */
    });
  }
}
/**
 * Set whether App Check will automatically refresh tokens as needed.
 *
 * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
 * refreshes App Check tokens as needed. This overrides any value set
 * during `initializeAppCheck()`.
 * @public
 */
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

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

import { AppCheck, AppCheckProvider } from './public-types';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { initialize as initializeRecaptcha } from './recaptcha';
import { getState, setState, AppCheckState } from './state';
import { FirebaseApp, getApp, _getProvider } from '@firebase/app-exp';
import { Provider } from '@firebase/component';
import { getModularInstance } from '@firebase/util';
import { AppCheckService } from './factory';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-check-exp': AppCheckService;
  }
}

/**
 * Returns a Firebase AppCheck instance for the given app.
 *
 * @public
 *
 * @param app - The FirebaseApp to use.
 */
export function getAppCheck(app: FirebaseApp = getApp()): AppCheck {
  app = getModularInstance(app);
  // Dependencies
  const appCheckProvider: Provider<'app-check-exp'> = _getProvider(
    app,
    'app-check-exp'
  );
  const appCheckInstance = appCheckProvider.getImmediate();
  return appCheckInstance;
}

/**
 * Activate AppCheck
 * @param app - Firebase app to activate AppCheck for.
 * @param siteKeyOrProvider - reCAPTCHA v3 site key (public key) or
 * custom token provider.
 * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
 * refreshes App Check tokens as needed. If undefined, defaults to the
 * value of `app.automaticDataCollectionEnabled`, which defaults to
 * false and can be set in the app config.
 * @public
 */
export function activate(
  app: FirebaseApp,
  siteKeyOrProvider: string | AppCheckProvider,
  isTokenAutoRefreshEnabled?: boolean
): void {
  const state = getState(app);
  if (state.activated) {
    throw ERROR_FACTORY.create(AppCheckError.ALREADY_ACTIVATED, {
      appName: app.name
    });
  }

  const newState: AppCheckState = { ...state, activated: true };
  if (typeof siteKeyOrProvider === 'string') {
    newState.siteKey = siteKeyOrProvider;
  } else {
    newState.customProvider = siteKeyOrProvider;
  }

  // Use value of global `automaticDataCollectionEnabled` (which
  // itself defaults to false if not specified in config) if
  // `isTokenAutoRefreshEnabled` param was not provided by user.
  newState.isTokenAutoRefreshEnabled =
    isTokenAutoRefreshEnabled === undefined
      ? app.automaticDataCollectionEnabled
      : isTokenAutoRefreshEnabled;

  setState(app, newState);

  // initialize reCAPTCHA if siteKey is provided
  if (newState.siteKey) {
    initializeRecaptcha(app, newState.siteKey).catch(() => {
      /* we don't care about the initialization result in activate() */
    });
  }
}
/**
 * @param isTokenAutoRefreshEnabled - If true, the SDK automatically
 * refreshes App Check tokens as needed. This overrides any value set
 * during `activate()`.
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

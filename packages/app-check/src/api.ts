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

import { AppCheckProvider } from '@firebase/app-check-types';
import { FirebaseApp } from '@firebase/app-types';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { initialize as initializeRecaptcha } from './recaptcha';
import { getState, setState, AppCheckState } from './state';

/**
 *
 * @param app
 * @param provider - optional custom attestation provider
 */
export function activate(
  app: FirebaseApp,
  siteKeyOrProvider: string | AppCheckProvider
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

  setState(app, newState);

  // initialize reCAPTCHA if siteKey is provided
  if (newState.siteKey) {
    initializeRecaptcha(app, newState.siteKey).catch(() => {
      /* we don't care about the initialization result in activate() */
    });
  }
}

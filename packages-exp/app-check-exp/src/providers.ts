/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirebaseApp } from '@firebase/app-exp';
import { Provider } from '@firebase/component';
import { exchangeToken, getExchangeRecaptchaTokenRequest } from './client';
import { AppCheckError, ERROR_FACTORY } from './errors';
import { AppCheckProvider } from './public-types';
import { getToken as getReCAPTCHAToken } from './recaptcha';
import { AppCheckTokenInternal } from './state';

/**
 * App Check provider that can obtain a reCAPTCHA V3 token and exchange it
 * for an AppCheck token.
 *
 * @public
 */
export class ReCaptchaV3Provider implements AppCheckProvider {
  /**
   * @internal
   */
  private _app?: FirebaseApp;
  /**
   * @internal
   */
  private _platformLoggerProvider?: Provider<'platform-logger'>;

  constructor(private _siteKey: string) {}

  async getToken(): Promise<AppCheckTokenInternal> {
    if (!this._app || !this._platformLoggerProvider) {
      // This should only occur if user has not called initializeAppCheck().
      // We don't have an appName to provide if so.
      // This should already be caught in the top level `getToken()` function.
      throw ERROR_FACTORY.create(AppCheckError.USE_BEFORE_ACTIVATION, {
        appName: ''
      });
    }
    const attestedClaimsToken = await getReCAPTCHAToken(this._app).catch(_e => {
      // reCaptcha.execute() throws null which is not very descriptive.
      throw ERROR_FACTORY.create(AppCheckError.RECAPTCHA_ERROR);
    });
    return exchangeToken(
      getExchangeRecaptchaTokenRequest(this._app, attestedClaimsToken),
      this._platformLoggerProvider
    );
  }

  /**
   * @internal
   */
  initialize(
    app: FirebaseApp,
    platformLoggerProvider: Provider<'platform-logger'>
  ): void {
    this._app = app;
    this._platformLoggerProvider = platformLoggerProvider;
  }

  get siteKey(): string {
    return this._siteKey;
  }
}

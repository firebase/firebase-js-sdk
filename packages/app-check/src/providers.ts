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

import { FirebaseApp } from '@firebase/app-types';
import { Provider } from '@firebase/component';
import { issuedAtTime } from '@firebase/util';
import { CustomProviderOptions } from '../../app-check-types';
import { exchangeToken, getExchangeRecaptchaTokenRequest } from './client';
import { ERROR_FACTORY, AppCheckError } from './errors';
import {
  getToken as getReCAPTCHAToken,
  initialize as initializeRecaptcha
} from './recaptcha';
import { AppCheckTokenInternal } from './state';

export interface AppCheckProviderInternal {
  /**
   * Returns an AppCheck token.
   */
  getToken(): Promise<AppCheckTokenInternal>;
  /**
   * Initialize the class once app and platformLoggerProvider are available.
   */
  initialize(
    app: FirebaseApp,
    platformLoggerProvider: Provider<'platform-logger'>
  ): void;
}

/**
 * App Check provider that can obtain a reCAPTCHA V3 token and exchange it
 * for an App Check token.
 */
export class ReCaptchaV3Provider implements AppCheckProviderInternal {
  private _app?: FirebaseApp;
  private _platformLoggerProvider?: Provider<'platform-logger'>;
  /**
   * Create a ReCaptchaV3Provider instance.
   * @param siteKey - ReCAPTCHA V3 siteKey.
   */
  constructor(private _siteKey: string) {}
  /**
   * Returns an App Check token.
   * @internal
   */
  async getToken(): Promise<AppCheckTokenInternal> {
    if (!this._app || !this._platformLoggerProvider) {
      // This should only occur if user has not called initializeAppCheck().
      // We don't have an appName to provide if so.
      // This should already be caught in the top level `getToken()` function.
      throw ERROR_FACTORY.create(AppCheckError.USE_BEFORE_ACTIVATION, {
        appName: ''
      });
    }
    let attestedClaimsToken;
    try {
      attestedClaimsToken = await getReCAPTCHAToken(this._app);
    } catch (e) {
      // reCaptcha.execute() throws null which is not very descriptive.
      throw ERROR_FACTORY.create(AppCheckError.RECAPTCHA_ERROR);
    }
    return exchangeToken(
      getExchangeRecaptchaTokenRequest(this._app, attestedClaimsToken),
      this._platformLoggerProvider
    );
  }

  initialize(
    app: FirebaseApp,
    platformLoggerProvider: Provider<'platform-logger'>
  ): void {
    this._app = app;
    this._platformLoggerProvider = platformLoggerProvider;
    initializeRecaptcha(app, this._siteKey).catch(() => {
      /* we don't care about the initialization result */
    });
  }
}

/**
 * Custom provider class.
 */
export class CustomProvider implements AppCheckProviderInternal {
  private _app?: FirebaseApp;

  constructor(private _customProviderOptions: CustomProviderOptions) {}

  /**
   * @internal
   */
  async getToken(): Promise<AppCheckTokenInternal> {
    if (!this._app) {
      // This should only occur if user has not called initializeAppCheck().
      // We don't have an appName to provide if so.
      // This should already be caught in the top level `getToken()` function.
      throw ERROR_FACTORY.create(AppCheckError.USE_BEFORE_ACTIVATION, {
        appName: ''
      });
    }
    // custom provider
    const customToken = await this._customProviderOptions.getToken();
    // Try to extract IAT from custom token, in case this token is not
    // being newly issued. JWT timestamps are in seconds since epoch.
    const issuedAtTimeSeconds = issuedAtTime(customToken.token);
    // Very basic validation, use current timestamp as IAT if JWT
    // has no `iat` field or value is out of bounds.
    const issuedAtTimeMillis =
      issuedAtTimeSeconds !== null &&
      issuedAtTimeSeconds < Date.now() &&
      issuedAtTimeSeconds > 0
        ? issuedAtTimeSeconds * 1000
        : Date.now();

    return { ...customToken, issuedAtTimeMillis };
  }

  /**
   * @internal
   */
  initialize(app: FirebaseApp): void {
    this._app = app;
  }
}

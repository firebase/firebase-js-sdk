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

import { AppCheckProvider, AppCheckToken } from '@firebase/app-check-types';
import { FirebaseApp } from '@firebase/app-types';
import { Provider } from '@firebase/component';
import { exchangeToken, getExchangeRecaptchaTokenRequest } from './client';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { formatDummyToken } from './util';
import { getToken as getReCAPTCHAToken } from './recaptcha';
import { AppCheckTokenInternal } from './state';

export class ReCAPTCHAV3Provider implements AppCheckProvider {
  constructor(private _siteKey: string) {}
  async getToken(): Promise<AppCheckToken> {
    return Promise.resolve({
      token: formatDummyToken({ error: 'NOT_ACTIVATED' }),
      expireTimeMillis: Date.now()
    });
  }
  get siteKey(): string {
    return this._siteKey;
  }
}

export class ReCAPTCHAV3ProviderInternal implements AppCheckProvider {
  constructor(
    private _app: FirebaseApp,
    private _siteKey: string,
    private _platformLoggerProvider: Provider<'platform-logger'>
  ) {}
  async getToken(): Promise<AppCheckTokenInternal> {
    const attestedClaimsToken = await getReCAPTCHAToken(this._app).catch(_e => {
      // reCaptcha.execute() throws null which is not very descriptive.
      throw ERROR_FACTORY.create(AppCheckError.RECAPTCHA_ERROR);
    });
    return exchangeToken(
      getExchangeRecaptchaTokenRequest(this._app, attestedClaimsToken),
      this._platformLoggerProvider
    );
  }
  get siteKey(): string {
    return this._siteKey;
  }
}

/**
 * @license
 * Copyright 2019 Google Inc.
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

import { PopupRedirectResolver } from '../model/popup_redirect_resolver';
import { Auth } from '../../src';
import { ProviderId, AuthProvider } from '../core/providers';
import { AuthEventType } from '../model/auth_event';
import { UserCredential } from '../model/user_credential';
import { AuthError, AUTH_ERROR_FACTORY } from '../core/errors';
import { ApiKey, AppName } from '../model/auth';
import { isEmpty } from '@firebase/util';
import { OAuthProvider } from '../core/providers/oauth';

/**
 * URL for Authentication widget which will initiate the OAuth handshake
 */
const WIDGET_URL = '/__/auth/handler';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Params = {
  [key: string]: string | undefined;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WidgetParams = {
  apiKey: ApiKey;
  appName: AppName;
  authType: AuthEventType;
  providerId?: ProviderId;
  customParameters?: string;
};

function queryString(params: Params): string {
  return Object.keys(params)
    .map(
      key =>
        `${encodeURIComponent(key)}=${encodeURIComponent(params[key] || '')}`
    )
    .join('&');
}

function getRedirectUrl(
  auth: Auth,
  provider: AuthProvider,
  authType: AuthEventType
): string {
  if (!auth.config.authDomain) {
    throw AUTH_ERROR_FACTORY.create(AuthError.MISSING_AUTH_DOMAIN, {
      appName: auth.name
    });
  }
  if (!auth.config.apiKey) {
    throw AUTH_ERROR_FACTORY.create(AuthError.INVALID_API_KEY, {
      appName: auth.name
    });
  }

  const params: WidgetParams = {
    apiKey: auth.config.apiKey,
    appName: auth.name,
    authType
  };

  if (provider instanceof OAuthProvider) {
    provider.setDefaultLanguage(auth.languageCode);
    params.providerId = provider.providerId;
    if (!isEmpty(provider.getCustomParameters())) {
      params.customParameters = JSON.stringify(provider.getCustomParameters());
    }
  }

  const url = new URL(
    `https://${auth.config.authDomain}/${WIDGET_URL}?${queryString(params)}`
  );

  return url.toString();
}

export class BrowserPopupRedirectResolver implements PopupRedirectResolver {
  processPopup(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<UserCredential> {
    throw new Error('not implemented');
  }

  processRedirect(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<never> {
    // Create iframe
    //        fireauth.iframeclient.IfcHandler.prototype.processRedirect =
    //        check origin validator(?)
    // Wait until iframe all done event

    location.href = getRedirectUrl(auth, provider, authType);
    return new Promise(() => {});
  }
}

export const browserPopupRedirectResolver: BrowserPopupRedirectResolver = new BrowserPopupRedirectResolver();

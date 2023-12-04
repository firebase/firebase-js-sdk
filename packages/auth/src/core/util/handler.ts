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

import { SDK_VERSION } from '@firebase/app';
import { AuthProvider } from '../../model/public_types';
import { ApiKey, AppName, AuthInternal } from '../../model/auth';
import { AuthEventType } from '../../model/popup_redirect';
import { AuthErrorCode } from '../errors';
import { _assert } from './assert';
import { isEmpty, querystring } from '@firebase/util';
import { _emulatorUrl } from './emulator';
import { FederatedAuthProvider } from '../providers/federated';
import { BaseOAuthProvider } from '../providers/oauth';

/**
 * URL for Authentication widget which will initiate the OAuth handshake
 *
 * @internal
 */
const WIDGET_PATH = '__/auth/handler';

/**
 * URL for emulated environment
 *
 * @internal
 */
const EMULATOR_WIDGET_PATH = 'emulator/auth/handler';

/**
 * Fragment name for the App Check token that gets passed to the widget
 *
 * @internal
 */
const FIREBASE_APP_CHECK_FRAGMENT_ID = encodeURIComponent('fac');

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WidgetParams = {
  apiKey: ApiKey;
  appName: AppName;
  authType: AuthEventType;
  redirectUrl?: string;
  v: string;
  providerId?: string;
  scopes?: string;
  customParameters?: string;
  eventId?: string;
  tid?: string;
} & { [key: string]: string | undefined };

export async function _getRedirectUrl(
  auth: AuthInternal,
  provider: AuthProvider,
  authType: AuthEventType,
  redirectUrl?: string,
  eventId?: string,
  additionalParams?: Record<string, string>
): Promise<string> {
  _assert(auth.config.authDomain, auth, AuthErrorCode.MISSING_AUTH_DOMAIN);
  _assert(auth.config.apiKey, auth, AuthErrorCode.INVALID_API_KEY);

  const params: WidgetParams = {
    apiKey: auth.config.apiKey,
    appName: auth.name,
    authType,
    redirectUrl,
    v: SDK_VERSION,
    eventId
  };

  if (provider instanceof FederatedAuthProvider) {
    provider.setDefaultLanguage(auth.languageCode);
    params.providerId = provider.providerId || '';
    if (!isEmpty(provider.getCustomParameters())) {
      params.customParameters = JSON.stringify(provider.getCustomParameters());
    }

    // TODO set additionalParams from the provider as well?
    for (const [key, value] of Object.entries(additionalParams || {})) {
      params[key] = value;
    }
  }

  if (provider instanceof BaseOAuthProvider) {
    const scopes = provider.getScopes().filter(scope => scope !== '');
    if (scopes.length > 0) {
      params.scopes = scopes.join(',');
    }
  }

  if (auth.tenantId) {
    params.tid = auth.tenantId;
  }

  // TODO: maybe set eid as endipointId
  // TODO: maybe set fw as Frameworks.join(",")

  const paramsDict = params as Record<string, string | number>;
  for (const key of Object.keys(paramsDict)) {
    if (paramsDict[key] === undefined) {
      delete paramsDict[key];
    }
  }

  // Sets the App Check token to pass to the widget
  const appCheckToken = await auth._getAppCheckToken();
  const appCheckTokenFragment = appCheckToken
    ? `#${FIREBASE_APP_CHECK_FRAGMENT_ID}=${encodeURIComponent(appCheckToken)}`
    : '';

  // Start at index 1 to skip the leading '&' in the query string
  return `${getHandlerBase(auth)}?${querystring(paramsDict).slice(
    1
  )}${appCheckTokenFragment}`;
}

function getHandlerBase({ config }: AuthInternal): string {
  if (!config.emulator) {
    return `https://${config.authDomain}/${WIDGET_PATH}`;
  }

  return _emulatorUrl(config, EMULATOR_WIDGET_PATH);
}

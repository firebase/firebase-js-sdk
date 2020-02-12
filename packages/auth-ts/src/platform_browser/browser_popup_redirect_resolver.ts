/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you maAuthErrorCode this file except in compliance with the License.
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
import {
  AuthEventType,
  AuthEvent,
  AUTH_EVENT_MESSAGE_TYPE
} from '../model/auth_event';
import { UserCredential } from '../model/user_credential';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { ApiKey, AppName } from '../model/auth';
import { isEmpty } from '@firebase/util';
import { OAuthProvider } from '../core/providers/oauth';
import { openIframe } from './iframe';
import { getCurrentUrl } from '../core/util/location';
import firebase from '@firebase/app';
import { SignInWithIdp } from '../api/authentication';
import { GoogleAuthProvider } from '../core/providers/google';
import { signInWithCredential } from '../core/strategies/auth_credential';

/**
 * URL for Authentication widget which will initiate the OAuth handshake
 */
const WIDGET_URL = '__/auth/handler';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Params = {
  [key: string]: string | undefined;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WidgetParams = {
  apiKey: ApiKey;
  appName: AppName;
  authType: AuthEventType;
  redirectUrl: string;
  v: string,
  providerId?: ProviderId;
  scopes?: string;
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
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.MISSING_AUTH_DOMAIN, {
      appName: auth.name
    });
  }
  if (!auth.config.apiKey) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INVALID_API_KEY, {
      appName: auth.name
    });
  }

  const params: WidgetParams = {
    apiKey: auth.config.apiKey,
    appName: auth.name,
    authType,
    redirectUrl: getCurrentUrl(),
    v: firebase.SDK_VERSION
  };

  if (provider instanceof OAuthProvider) {
    provider.setDefaultLanguage(auth.languageCode);
    params.providerId = provider.providerId;
    if (!isEmpty(provider.getCustomParameters())) {
      params.customParameters = JSON.stringify(provider.getCustomParameters());
    }
    const scopes = provider.getScopes();
    if(scopes.length > 0) {
      params.scopes = scopes.join(",");
    }
    // TODO set additionalParams?
    // let additionalParams = provider.getAdditionalParams();
    // for (let key in additionalParams) {
    //   if (!params.hasOwnProperty(key)) {
    //     params[key] = additionalParams[key]
    //   }
    // }
  }

  // TODO: maybe need to set eventId?
  // TODO: maybe set tid as tenantId
  // TODO: maybe set eid as endipointId
  // TODO: maybe set fw as Frameworks.join(",")

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

  async getRedirectResult(auth: Auth): Promise<UserCredential | null> {
    const iframe = await openIframe(auth);

    iframe.register<AuthEvent>(
      AUTH_EVENT_MESSAGE_TYPE,
      async (message: AuthEvent) => {
        let response = await SignInWithIdp(auth, {
          requestUri: message.authEvent.urlResponse!,
          postBody: message.authEvent.postBody,
          sessionId: message.authEvent.sessionId!,
          returnSecureToken: true
        })
        let credential = GoogleAuthProvider.credential(response.idToken)
        let user_credential = signInWithCredential(auth, credential)
        console.log(message);
      },
      gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER
    );

    return null;

    // const authEventManager_ = await getAuthEventManager_(auth);
    // return authEventManager_.getRedirectResult();
  }
}

export const browserPopupRedirectResolver: BrowserPopupRedirectResolver = new BrowserPopupRedirectResolver();

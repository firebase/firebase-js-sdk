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

import { SDK_VERSION } from '@firebase/app-exp';
import * as externs from '@firebase/auth-types-exp';
import { isEmpty, querystring } from '@firebase/util';

import { AuthEventManager } from '../core/auth/auth_event_manager';
import { AuthErrorCode } from '../core/errors';
import { OAuthProvider } from '../core/providers/oauth';
import { assert, debugAssert } from '../core/util/assert';
import { _emulatorUrl } from '../core/util/emulator';
import { _generateEventId } from '../core/util/event_id';
import { _getCurrentUrl } from '../core/util/location';
import { _validateOrigin } from '../core/util/validate_origin';
import { ApiKey, AppName, Auth } from '../model/auth';
import {
  AuthEventType,
  EventManager,
  GapiAuthEvent,
  GapiOutcome,
  PopupRedirectResolver
} from '../model/popup_redirect';
import { _setWindowLocation } from './auth_window';
import { _openIframe } from './iframe/iframe';
import { browserSessionPersistence } from './persistence/session_storage';
import { _open, AuthPopup } from './util/popup';

/**
 * URL for Authentication widget which will initiate the OAuth handshake
 */
const WIDGET_PATH = '__/auth/handler';

/**
 * URL for emulated environment
 */
const EMULATOR_WIDGET_PATH = 'emulator/auth/handler';

interface ManagerOrPromise {
  manager?: EventManager;
  promise?: Promise<EventManager>;
}

class BrowserPopupRedirectResolver implements PopupRedirectResolver {
  private readonly eventManagers: Record<string, ManagerOrPromise> = {};
  private readonly originValidationPromises: Record<string, Promise<void>> = {};

  readonly _redirectPersistence = browserSessionPersistence;

  // Wrapping in async even though we don't await anywhere in order
  // to make sure errors are raised as promise rejections
  async _openPopup(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<AuthPopup> {
    debugAssert(
      this.eventManagers[auth._key()]?.manager,
      '_initialize() not called before _openPopup()'
    );
    await this.originValidation(auth);
    const url = getRedirectUrl(auth, provider, authType, eventId);
    return _open(auth.name, url, _generateEventId());
  }

  async _openRedirect(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<never> {
    await this.originValidation(auth);
    _setWindowLocation(getRedirectUrl(auth, provider, authType, eventId));
    return new Promise(() => {});
  }

  _initialize(auth: Auth): Promise<EventManager> {
    const key = auth._key();
    if (this.eventManagers[key]) {
      const { manager, promise } = this.eventManagers[key];
      if (manager) {
        return Promise.resolve(manager);
      } else {
        debugAssert(promise, 'If manager is not set, promise should be');
        return promise;
      }
    }

    const promise = this.initAndGetManager(auth);
    this.eventManagers[key] = { promise };
    return promise;
  }

  private async initAndGetManager(auth: Auth): Promise<EventManager> {
    const iframe = await _openIframe(auth);
    const manager = new AuthEventManager(auth.name);
    iframe.register<GapiAuthEvent>(
      'authEvent',
      ({ authEvent }: GapiAuthEvent) => {
        // TODO: Consider splitting redirect and popup events earlier on
        const handled = manager.onEvent(authEvent);
        return { status: handled ? GapiOutcome.ACK : GapiOutcome.ERROR };
      },
      gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER
    );

    this.eventManagers[auth._key()] = { manager };
    return manager;
  }

  private originValidation(auth: Auth): Promise<void> {
    const key = auth._key();
    if (!this.originValidationPromises[key]) {
      this.originValidationPromises[key] = _validateOrigin(auth);
    }

    return this.originValidationPromises[key];
  }
}

export const browserPopupRedirectResolver: externs.PopupRedirectResolver = BrowserPopupRedirectResolver;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WidgetParams = {
  apiKey: ApiKey;
  appName: AppName;
  authType: AuthEventType;
  redirectUrl: string;
  v: string;
  providerId?: string;
  scopes?: string;
  customParameters?: string;
  eventId?: string;
  tid?: string;
};

function getRedirectUrl(
  auth: Auth,
  provider: externs.AuthProvider,
  authType: AuthEventType,
  eventId?: string
): string {
  assert(auth.config.authDomain, AuthErrorCode.MISSING_AUTH_DOMAIN, {
    appName: auth.name
  });
  assert(auth.config.apiKey, AuthErrorCode.INVALID_API_KEY, {
    appName: auth.name
  });

  const params: WidgetParams = {
    apiKey: auth.config.apiKey,
    appName: auth.name,
    authType,
    redirectUrl: _getCurrentUrl(),
    v: SDK_VERSION,
    eventId
  };

  if (provider instanceof OAuthProvider) {
    provider.setDefaultLanguage(auth.languageCode);
    params.providerId = provider.providerId || '';
    if (!isEmpty(provider.getCustomParameters())) {
      params.customParameters = JSON.stringify(provider.getCustomParameters());
    }
    const scopes = provider.getScopes().filter(scope => scope !== '');
    if (scopes.length > 0) {
      params.scopes = scopes.join(',');
    }
    // TODO set additionalParams?
    // let additionalParams = provider.getAdditionalParams();
    // for (let key in additionalParams) {
    //   if (!params.hasOwnProperty(key)) {
    //     params[key] = additionalParams[key]
    //   }
    // }
  }

  if (auth.tenantId) {
    params.tid = auth.tenantId;
  }

  for (const key of Object.keys(params)) {
    if ((params as Record<string, unknown>)[key] === undefined) {
      delete (params as Record<string, unknown>)[key];
    }
  }

  // TODO: maybe set eid as endipointId
  // TODO: maybe set fw as Frameworks.join(",")

  const url = new URL(
    `${getHandlerBase(auth)}?${querystring(
      params as Record<string, string | number>
    ).slice(1)}`
  );

  return url.toString();
}

function getHandlerBase({ config }: Auth): string {
  if (!config.emulator) {
    return `https://${config.authDomain}/${WIDGET_PATH}`;
  }

  return _emulatorUrl(config, EMULATOR_WIDGET_PATH);
}

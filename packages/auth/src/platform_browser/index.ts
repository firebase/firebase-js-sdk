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

import { FirebaseApp, getApp, _getProvider } from '@firebase/app';

import {
  initializeAuth,
  beforeAuthStateChanged,
  onIdTokenChanged,
  connectAuthEmulator
} from '..';
import { registerAuth } from '../core/auth/register';
import { ClientPlatform } from '../core/util/version';
import { browserLocalPersistence } from './persistence/local_storage';
import { browserSessionPersistence } from './persistence/session_storage';
import { indexedDBLocalPersistence } from './persistence/indexed_db';
import { browserPopupRedirectResolver } from './popup_redirect';
import { Auth, User } from '../model/public_types';
import { getDefaultEmulatorHost, getExperimentalSetting } from '@firebase/util';
import { _setExternalJSProvider } from './load_js';
import { _createError } from '../core/util/assert';
import { AuthErrorCode } from '../core/errors';

const DEFAULT_ID_TOKEN_MAX_AGE = 5 * 60;
const authIdTokenMaxAge =
  getExperimentalSetting('authIdTokenMaxAge') || DEFAULT_ID_TOKEN_MAX_AGE;

let lastPostedIdToken: string | undefined | null = null;

const mintCookieFactory = (url: string) => async (user: User | null) => {
  const idTokenResult = user && (await user.getIdTokenResult());
  const idTokenAge =
    idTokenResult &&
    (new Date().getTime() - Date.parse(idTokenResult.issuedAtTime)) / 1_000;
  if (idTokenAge && idTokenAge > authIdTokenMaxAge) {
    return;
  }
  // Specifically trip null => undefined when logged out, to delete any existing cookie
  const idToken = idTokenResult?.token;
  if (lastPostedIdToken === idToken) {
    return;
  }
  lastPostedIdToken = idToken;
  await fetch(url, {
    method: idToken ? 'POST' : 'DELETE',
    headers: idToken
      ? {
          'Authorization': `Bearer ${idToken}`
        }
      : {}
  });
};

/**
 * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
 * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
 *
 * @param app - The Firebase App.
 *
 * @public
 */
export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  const auth = initializeAuth(app, {
    popupRedirectResolver: browserPopupRedirectResolver,
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence
    ]
  });

  const authTokenSyncPath = getExperimentalSetting('authTokenSyncURL');
  // Don't allow urls (XSS possibility), only paths on the same domain
  // (starting with a single '/')
  if (authTokenSyncPath && authTokenSyncPath.match(/^\/[^\/].*/)) {
    const mintCookie = mintCookieFactory(authTokenSyncPath);
    beforeAuthStateChanged(auth, mintCookie, () =>
      mintCookie(auth.currentUser)
    );
    onIdTokenChanged(auth, user => mintCookie(user));
  }

  const authEmulatorHost = getDefaultEmulatorHost('auth');
  if (authEmulatorHost) {
    connectAuthEmulator(auth, `http://${authEmulatorHost}`);
  }

  return auth;
}

function getScriptParentElement(): HTMLDocument | HTMLHeadElement {
  return document.getElementsByTagName('head')?.[0] ?? document;
}

_setExternalJSProvider({
  loadJS(url: string): Promise<Event> {
    // TODO: consider adding timeout support & cancellation
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.setAttribute('src', url);
      el.onload = resolve;
      el.onerror = e => {
        const error = _createError(AuthErrorCode.INTERNAL_ERROR);
        error.customData = e as unknown as Record<string, unknown>;
        reject(error);
      };
      el.type = 'text/javascript';
      el.charset = 'UTF-8';
      getScriptParentElement().appendChild(el);
    });
  },

  gapiScript: 'https://apis.google.com/js/api.js',
  recaptchaV2Script: 'https://www.google.com/recaptcha/api.js',
  recaptchaEnterpriseScript:
    'https://www.google.com/recaptcha/enterprise.js?render='
});

registerAuth(ClientPlatform.BROWSER);

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

import './plugins';
import * as externs from '@firebase/auth-types-exp';
import { browserSessionPersistence } from '../platform_browser/persistence/session_storage';
import { Auth } from '../model/auth';
import {
  AuthEventType,
  EventManager,
  PopupRedirectResolver
} from '../model/popup_redirect';
import { AuthPopup } from '../platform_browser/util/popup';
import { _assert, _fail } from '../core/util/assert';
import { AuthErrorCode } from '../core/errors';

class CordovaPopupRedirectResolver implements PopupRedirectResolver {
  readonly _redirectPersistence = browserSessionPersistence;
  _completeRedirectFn: () => Promise<null> = async () => null;

  _initialize(_auth: Auth): Promise<EventManager> {
    throw new Error('Method not implemented.');
  }
  _openPopup(auth: Auth): Promise<AuthPopup> {
    _fail(auth, AuthErrorCode.OPERATION_NOT_SUPPORTED);
  }
  _openRedirect(
    auth: Auth,
    _provider: externs.AuthProvider,
    _authType: AuthEventType,
    _eventId?: string
  ): Promise<never> {
    checkCordovaConfiguration(auth);
    return new Promise(() => {});
  }
  _isIframeWebStorageSupported(
    _auth: Auth,
    _cb: (support: boolean) => unknown
  ): void {
    throw new Error('Method not implemented.');
  }
}

function checkCordovaConfiguration(auth: Auth): void {
  // Check all dependencies installed.
  // https://github.com/nordnet/cordova-universal-links-plugin
  // Note that cordova-universal-links-plugin has been abandoned.
  // A fork with latest fixes is available at:
  // https://www.npmjs.com/package/cordova-universal-links-plugin-fix
  _assert(
    typeof window?.universalLinks?.subscribe === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-universal-links-plugin-fix'
    }
  );

  // https://www.npmjs.com/package/cordova-plugin-buildinfo
  _assert(
    typeof window?.BuildInfo?.packageName !== 'undefined',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-buildInfo'
    }
  );

  // https://github.com/google/cordova-plugin-browsertab
  _assert(
    typeof window?.cordova?.plugins?.browsertab?.openUrl === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-browsertab'
    }
  );

  // https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-inappbrowser/
  _assert(
    typeof window?.cordova?.InAppBrowser?.open === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-inappbrowser'
    }
  );
}

/**
 * An implementation of {@link @firebase/auth-types#PopupRedirectResolver} suitable for Cordova
 * based applications.
 *
 * @public
 */
export const cordovaPopupRedirectResolver: externs.PopupRedirectResolver = CordovaPopupRedirectResolver;

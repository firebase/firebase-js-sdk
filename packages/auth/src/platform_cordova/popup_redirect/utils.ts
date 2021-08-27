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

import { AuthProvider } from '../../model/public_types';
import { AuthErrorCode } from '../../core/errors';
import {
  debugAssert,
  _assert,
  _createError,
  _fail
} from '../../core/util/assert';
import { _isAndroid, _isIOS, _isIOS7Or8 } from '../../core/util/browser';
import { _getRedirectUrl } from '../../core/util/handler';
import { AuthInternal } from '../../model/auth';
import { AuthEvent } from '../../model/popup_redirect';
import { InAppBrowserRef, _cordovaWindow } from '../plugins';
import {
  GetProjectConfigRequest,
  _getProjectConfig
} from '../../api/project_config/get_project_config';

/**
 * How long to wait after the app comes back into focus before concluding that
 * the user closed the sign in tab.
 */
const REDIRECT_TIMEOUT_MS = 2000;

/**
 * Generates the URL for the OAuth handler.
 */
export async function _generateHandlerUrl(
  auth: AuthInternal,
  event: AuthEvent,
  provider: AuthProvider
): Promise<string> {
  // Get the cordova plugins
  const { BuildInfo } = _cordovaWindow();
  debugAssert(event.sessionId, 'AuthEvent did not contain a session ID');
  const sessionDigest = await computeSha256(event.sessionId);

  const additionalParams: Record<string, string> = {};
  if (_isIOS()) {
    // iOS app identifier
    additionalParams['ibi'] = BuildInfo.packageName;
  } else if (_isAndroid()) {
    // Android app identifier
    additionalParams['apn'] = BuildInfo.packageName;
  } else {
    _fail(auth, AuthErrorCode.OPERATION_NOT_SUPPORTED);
  }

  // Add the display name if available
  if (BuildInfo.displayName) {
    additionalParams['appDisplayName'] = BuildInfo.displayName;
  }

  // Attached the hashed session ID
  additionalParams['sessionId'] = sessionDigest;
  return _getRedirectUrl(
    auth,
    provider,
    event.type,
    undefined,
    event.eventId ?? undefined,
    additionalParams
  );
}

/**
 * Validates that this app is valid for this project configuration
 */
export async function _validateOrigin(auth: AuthInternal): Promise<void> {
  const { BuildInfo } = _cordovaWindow();
  const request: GetProjectConfigRequest = {};
  if (_isIOS()) {
    request.iosBundleId = BuildInfo.packageName;
  } else if (_isAndroid()) {
    request.androidPackageName = BuildInfo.packageName;
  } else {
    _fail(auth, AuthErrorCode.OPERATION_NOT_SUPPORTED);
  }

  // Will fail automatically if package name is not authorized
  await _getProjectConfig(auth, request);
}

export function _performRedirect(
  handlerUrl: string
): Promise<InAppBrowserRef | null> {
  // Get the cordova plugins
  const { cordova } = _cordovaWindow();

  return new Promise(resolve => {
    cordova.plugins.browsertab.isAvailable(browserTabIsAvailable => {
      let iabRef: InAppBrowserRef | null = null;
      if (browserTabIsAvailable) {
        cordova.plugins.browsertab.openUrl(handlerUrl);
      } else {
        // TODO: Return the inappbrowser ref that's returned from the open call
        iabRef = cordova.InAppBrowser.open(
          handlerUrl,
          _isIOS7Or8() ? '_blank' : '_system',
          'location=yes'
        );
      }
      resolve(iabRef);
    });
  });
}

// Thin interface wrapper to avoid circular dependency with ./events module
interface PassiveAuthEventListener {
  addPassiveListener(cb: () => void): void;
  removePassiveListener(cb: () => void): void;
}

/**
 * This function waits for app activity to be seen before resolving. It does
 * this by attaching listeners to various dom events. Once the app is determined
 * to be visible, this promise resolves. AFTER that resolution, the listeners
 * are detached and any browser tabs left open will be closed.
 */
export async function _waitForAppResume(
  auth: AuthInternal,
  eventListener: PassiveAuthEventListener,
  iabRef: InAppBrowserRef | null
): Promise<void> {
  // Get the cordova plugins
  const { cordova } = _cordovaWindow();

  let cleanup = (): void => {};
  try {
    await new Promise<void>((resolve, reject) => {
      let onCloseTimer: number | null = null;

      // DEFINE ALL THE CALLBACKS =====
      function authEventSeen(): void {
        // Auth event was detected. Resolve this promise and close the extra
        // window if it's still open.
        resolve();
        const closeBrowserTab = cordova.plugins.browsertab?.close;
        if (typeof closeBrowserTab === 'function') {
          closeBrowserTab();
        }
        // Close inappbrowser emebedded webview in iOS7 and 8 case if still
        // open.
        if (typeof iabRef?.close === 'function') {
          iabRef.close();
        }
      }

      function resumed(): void {
        if (onCloseTimer) {
          // This code already ran; do not rerun.
          return;
        }

        onCloseTimer = window.setTimeout(() => {
          // Wait two seeconds after resume then reject.
          reject(_createError(auth, AuthErrorCode.REDIRECT_CANCELLED_BY_USER));
        }, REDIRECT_TIMEOUT_MS);
      }

      function visibilityChanged(): void {
        if (document?.visibilityState === 'visible') {
          resumed();
        }
      }

      // ATTACH ALL THE LISTENERS =====
      // Listen for the auth event
      eventListener.addPassiveListener(authEventSeen);

      // Listen for resume and visibility events
      document.addEventListener('resume', resumed, false);
      if (_isAndroid()) {
        document.addEventListener('visibilitychange', visibilityChanged, false);
      }

      // SETUP THE CLEANUP FUNCTION =====
      cleanup = () => {
        eventListener.removePassiveListener(authEventSeen);
        document.removeEventListener('resume', resumed, false);
        document.removeEventListener(
          'visibilitychange',
          visibilityChanged,
          false
        );
        if (onCloseTimer) {
          window.clearTimeout(onCloseTimer);
        }
      };
    });
  } finally {
    cleanup();
  }
}

/**
 * Checks the configuration of the Cordova environment. This has no side effect
 * if the configuration is correct; otherwise it throws an error with the
 * missing plugin.
 */
export function _checkCordovaConfiguration(auth: AuthInternal): void {
  const win = _cordovaWindow();
  // Check all dependencies installed.
  // https://github.com/nordnet/cordova-universal-links-plugin
  // Note that cordova-universal-links-plugin has been abandoned.
  // A fork with latest fixes is available at:
  // https://www.npmjs.com/package/cordova-universal-links-plugin-fix
  _assert(
    typeof win?.universalLinks?.subscribe === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-universal-links-plugin-fix'
    }
  );

  // https://www.npmjs.com/package/cordova-plugin-buildinfo
  _assert(
    typeof win?.BuildInfo?.packageName !== 'undefined',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-buildInfo'
    }
  );

  // https://github.com/google/cordova-plugin-browsertab
  _assert(
    typeof win?.cordova?.plugins?.browsertab?.openUrl === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-browsertab'
    }
  );
  _assert(
    typeof win?.cordova?.plugins?.browsertab?.isAvailable === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-browsertab'
    }
  );

  // https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-inappbrowser/
  _assert(
    typeof win?.cordova?.InAppBrowser?.open === 'function',
    auth,
    AuthErrorCode.INVALID_CORDOVA_CONFIGURATION,
    {
      missingPlugin: 'cordova-plugin-inappbrowser'
    }
  );
}

/**
 * Computes the SHA-256 of a session ID. The SubtleCrypto interface is only
 * available in "secure" contexts, which covers Cordova (which is served on a file
 * protocol).
 */
async function computeSha256(sessionId: string): Promise<string> {
  const bytes = stringToArrayBuffer(sessionId);

  // TODO: For IE11 crypto has a different name and this operation comes back
  //       as an object, not a promise. This is the old proposed standard that
  //       is used by IE11:
  // https://www.w3.org/TR/2013/WD-WebCryptoAPI-20130108/#cryptooperation-interface
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(num => num.toString(16).padStart(2, '0')).join('');
}

function stringToArrayBuffer(str: string): Uint8Array {
  // This function is only meant to deal with an ASCII charset and makes
  // certain simplifying assumptions.
  debugAssert(
    /[0-9a-zA-Z]+/.test(str),
    'Can only convert alpha-numeric strings'
  );
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }

  const buff = new ArrayBuffer(str.length);
  const view = new Uint8Array(buff);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return view;
}

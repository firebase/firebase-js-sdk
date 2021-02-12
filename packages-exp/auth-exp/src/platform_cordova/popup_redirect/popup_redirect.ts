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

import '../plugins';
import * as externs from '@firebase/auth-types-exp';
import { browserSessionPersistence } from '../../platform_browser/persistence/session_storage';
import { Auth } from '../../model/auth';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { AuthPopup } from '../../platform_browser/util/popup';
import { debugAssert, _createError, _fail } from '../../core/util/assert';
import { AuthErrorCode } from '../../core/errors';
import {
  _checkCordovaConfiguration,
  _generateHandlerUrl,
  _performRedirect
} from './utils';
import {
  _eventFromPartialAndUrl,
  _generateNewEvent,
  _getAndRemoveEvent,
  _savePartialEvent
} from './events';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { _isAndroid } from '../../core/util/browser';

/**
 * How long to wait for the initial auth event before concluding no
 * redirect pending
 */
const INITIAL_EVENT_TIMEOUT_MS = 500;

/**
 * How long to wait after the app comes back into focus before concluding that
 * the user closed the sign in tab.
 */
const REDIRECT_TIMEOUT_MS = 2000;

/** Custom AuthEventManager that adds passive listeners to events */
export class CordovaAuthEventManager extends AuthEventManager {
  private readonly passiveListeners = new Set<(e: AuthEvent) => void>();
  private resolveInialized!: () => void;
  initialized = new Promise<void>(resolve => {
    this.resolveInialized = resolve;
  });

  addPassiveListener(cb: (e: AuthEvent) => void): void {
    this.passiveListeners.add(cb);
  }

  removePassiveListener(cb: (e: AuthEvent) => void): void {
    this.passiveListeners.delete(cb);
  }

  // In a Cordova environment, this manager can live through multiple redirect
  // operations
  resetRedirect(): void {
    this.queuedRedirectEvent = null;
    this.hasHandledPotentialRedirect = false;
  }

  /** Override the onEvent method */
  onEvent(event: AuthEvent): boolean {
    this.resolveInialized();
    this.passiveListeners.forEach(cb => cb(event));
    return super.onEvent(event);
  }
}

class CordovaPopupRedirectResolver implements PopupRedirectResolver {
  readonly _redirectPersistence = browserSessionPersistence;
  private readonly eventManagers = new Map<string, CordovaAuthEventManager>();

  _completeRedirectFn = async (): Promise<null> => null;

  async _initialize(auth: Auth): Promise<CordovaAuthEventManager> {
    const key = auth._key();
    let manager = this.eventManagers.get(key);
    if (!manager) {
      manager = new CordovaAuthEventManager(auth);
      this.eventManagers.set(key, manager);
      this.attachCallbackListeners(auth, manager);
    }
    return manager;
  }

  _openPopup(auth: Auth): Promise<AuthPopup> {
    _fail(auth, AuthErrorCode.OPERATION_NOT_SUPPORTED);
  }

  async _openRedirect(
    auth: Auth,
    provider: externs.AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<void> {
    _checkCordovaConfiguration(auth);
    const manager = await this._initialize(auth);
    await manager.initialized;
    console.log('here');
    manager.resetRedirect();

    const event = _generateNewEvent(auth, authType, eventId);
    await _savePartialEvent(auth, event);
    const url = await _generateHandlerUrl(auth, event, provider);
    const iabRef = await _performRedirect(url);
    return listenForAppActivity(auth, manager, iabRef);
  }

  _isIframeWebStorageSupported(
    _auth: Auth,
    _cb: (support: boolean) => unknown
  ): void {
    throw new Error('Method not implemented.');
  }

  private attachCallbackListeners(auth: Auth, manager: AuthEventManager): void {
    const noEventTimeout = setTimeout(async () => {
      // We didn't see that initial event. Clear any pending object and
      // dispatch no event
      await _getAndRemoveEvent(auth);
      manager.onEvent(generateNoEvent());
    }, INITIAL_EVENT_TIMEOUT_MS);

    const universalLinksCb = async (
      eventData: Record<string, string> | null
    ): Promise<void> => {
      // We have an event so we can clear the no event timeout
      clearTimeout(noEventTimeout);

      const partialEvent = await _getAndRemoveEvent(auth);
      let finalEvent: AuthEvent | null = null;
      if (partialEvent && eventData?.['url']) {
        finalEvent = _eventFromPartialAndUrl(partialEvent, eventData['url']);
      }

      // If finalEvent is never filled, trigger with no event
      manager.onEvent(finalEvent || generateNoEvent());
    };

    // Universal links subscriber doesn't exist for iOS, so we need to check
    if (typeof universalLinks !== 'undefined' && typeof universalLinks.subscribe === 'function') {
      universalLinks.subscribe(null, universalLinksCb);
    }

    // iOS 7 or 8 custom URL schemes.
    // This is also the current default behavior for iOS 9+.
    // For this to work, cordova-plugin-customurlscheme needs to be installed.
    // https://github.com/EddyVerbruggen/Custom-URL-scheme
    // Do not overwrite the existing developer's URL handler.
    const existingHandleOpenUrl = window.handleOpenUrl;
    const packagePrefix = `${BuildInfo.packageName.toLowerCase()}://`;
    window.handleOpenUrl = async url => {
      if (url.toLowerCase().startsWith(packagePrefix)) {
        // We want this intentionally to float
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        universalLinksCb({ url });
      }
      // Call the developer's handler if it is present.
      if (typeof existingHandleOpenUrl === 'function') {
        try {
          existingHandleOpenUrl(url);
        } catch (e) {
          // This is a developer error. Don't stop the flow of the SDK.
          console.error(e);
        }
      }
    };
  }
}

/**
 * This function waits for app activity to be seen before resolving. It does
 * this by attaching listeners to various dom events. Once the app is determined
 * to be visible, this promise resolves. AFTER that resolution, the listeners
 * are detached and any browser tabs left open will be closed.
 */
async function listenForAppActivity(auth: Auth, eventManager: CordovaAuthEventManager, iabRef: InAppBrowserRef|null): Promise<void> {
  let cleanup = () => {};
  try {
    await new Promise<void>((resolve, reject) => {
      let onCloseTimer: number|null = null;

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
      eventManager.addPassiveListener(authEventSeen);

      // Listen for resume and visibility events
      document.addEventListener('resume', resumed, false);
      if (_isAndroid()) {
        document.addEventListener('visibilitychange', visibilityChanged, false);
      }

      // SETUP THE CLEANUP FUNCTION =====
      cleanup = () => {
        eventManager.removePassiveListener(authEventSeen);
        document.removeEventListener('resume', resumed, false);
        document.removeEventListener('visibilitychange', visibilityChanged, false);
        if (onCloseTimer) {
          window.clearTimeout(onCloseTimer);
        }
      }
    });
  } finally {
    cleanup();
  }
}

/**
 * An implementation of {@link @firebase/auth-types#PopupRedirectResolver} suitable for Cordova
 * based applications.
 *
 * @public
 */
export const cordovaPopupRedirectResolver: externs.PopupRedirectResolver = CordovaPopupRedirectResolver;

function generateNoEvent(): AuthEvent {
  return {
    type: AuthEventType.UNKNOWN,
    eventId: null,
    sessionId: null,
    urlResponse: null,
    postBody: null,
    tenantId: null,
    error: _createError(AuthErrorCode.NO_AUTH_EVENT)
  };
}

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
import { _createError, _fail } from '../../core/util/assert';
import { AuthErrorCode } from '../../core/errors';
import {
  _checkCordovaConfiguration,
  _generateHandlerUrl,
  _performRedirect
} from './utils';
import { _eventFromPartialAndUrl, _generateNewEvent, _getAndRemoveEvent } from './events';
import { AuthEventManager } from '../../core/auth/auth_event_manager';

/** 
 * How long to wait for the initial auth event before concluding no
 * redirect pending
 */
const INITIAL_EVENT_TIMEOUT_MS = 500;

/** Custom AuthEventManager that adds passive listeners to events */
export class CordovaAuthEventManager extends AuthEventManager {
  private readonly passiveListeners: Set<(e: AuthEvent) => void> = new Set();

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
    this.passiveListeners.forEach(cb => cb(event));
    return super.onEvent(event);
  }
}

class CordovaPopupRedirectResolver implements PopupRedirectResolver {
  readonly _redirectPersistence = browserSessionPersistence;
  private readonly eventManagers: Record<string, CordovaAuthEventManager> = {};

  _completeRedirectFn: () => Promise<null> = async () => null;

  async _initialize(auth: Auth): Promise<CordovaAuthEventManager> {
    const key = auth._key();
    if (!this.eventManagers[key]) {
      const manager = new CordovaAuthEventManager(auth);
      this.eventManagers[key] = manager;
      this.attachCallbackListeners(auth, manager);
    }
    return this.eventManagers[key];
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
    const event = _generateNewEvent(auth, authType, eventId);
    const url = await _generateHandlerUrl(auth, event, provider);
    await _performRedirect(url);
  }

  _isIframeWebStorageSupported(
    _auth: Auth,
    _cb: (support: boolean) => unknown
  ): void {
    throw new Error('Method not implemented.');
  }

  private attachCallbackListeners(auth: Auth, manager: AuthEventManager): void {
    const noEvent: AuthEvent = {
      type: AuthEventType.UNKNOWN,
      eventId: null,
      sessionId: null,
      urlResponse: null,
      postBody: null,
      tenantId: null,
      error: _createError(AuthErrorCode.NO_AUTH_EVENT),
    };

    const noEventTimeout = setTimeout(async () => {
      // We didn't see that initial event. Clear any pending object and
      // dispatch no event
      await _getAndRemoveEvent(auth);
      manager.onEvent(noEvent);
    }, INITIAL_EVENT_TIMEOUT_MS);

    const universalLinksCb = async (eventData: Record<string, string>|null): Promise<void> => {
      // We have an event so we can clear the no event timeout
      clearTimeout(noEventTimeout);

      const partialEvent = await _getAndRemoveEvent(auth);
      let finalEvent: AuthEvent|null = noEvent;
      // Start with the noEvent
      if (partialEvent && eventData?.['url']) {
        finalEvent = _eventFromPartialAndUrl(partialEvent, eventData['url']);
      }
      manager.onEvent(finalEvent || noEvent);
    };

    // iOS 7 or 8 custom URL schemes.
    // This is also the current default behavior for iOS 9+.
    // For this to work, cordova-plugin-customurlscheme needs to be installed.
    // https://github.com/EddyVerbruggen/Custom-URL-scheme
    // Do not overwrite the existing developer's URL handler.
    const existingHandleOpenUrl = window.handleOpenUrl;
    window.handleOpenUrl = async url => {
      if (url.toLowerCase().startsWith(`${BuildInfo.packageName.toLowerCase()}://`)) {
        // We want this intentionally to float
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        universalLinksCb({url});
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

    // Universal links subscriber doesn't exist for iOS, so we need to check
    if (typeof universalLinks.subscribe === 'function') {
      universalLinks.subscribe(null, universalLinksCb);
    }
  }
}

/**
 * An implementation of {@link @firebase/auth-types#PopupRedirectResolver} suitable for Cordova
 * based applications.
 *
 * @public
 */
export const cordovaPopupRedirectResolver: externs.PopupRedirectResolver = CordovaPopupRedirectResolver;

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

import { AuthProvider, PopupRedirectResolver } from '../../model/public_types';
import { browserSessionPersistence } from '../../platform_browser/persistence/session_storage';
import { AuthInternal } from '../../model/auth';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { AuthPopup } from '../../platform_browser/util/popup';
import { _createError, _fail } from '../../core/util/assert';
import { AuthErrorCode } from '../../core/errors';
import {
  _checkCordovaConfiguration,
  _generateHandlerUrl,
  _performRedirect,
  _validateOrigin,
  _waitForAppResume
} from './utils';
import {
  CordovaAuthEventManager,
  _eventFromPartialAndUrl,
  _generateNewEvent,
  _getAndRemoveEvent,
  _savePartialEvent
} from './events';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { _getRedirectResult } from '../../platform_browser/strategies/redirect';
import {
  _clearRedirectOutcomes,
  _overrideRedirectResult
} from '../../core/strategies/redirect';
import { _cordovaWindow } from '../plugins';

/**
 * How long to wait for the initial auth event before concluding no
 * redirect pending
 */
const INITIAL_EVENT_TIMEOUT_MS = 500;

class CordovaPopupRedirectResolver implements PopupRedirectResolverInternal {
  readonly _redirectPersistence = browserSessionPersistence;
  readonly _shouldInitProactively = true; // This is lightweight for Cordova
  private readonly eventManagers = new Map<string, CordovaAuthEventManager>();
  private readonly originValidationPromises: Record<string, Promise<void>> = {};

  _completeRedirectFn = _getRedirectResult;
  _overrideRedirectResult = _overrideRedirectResult;

  async _initialize(auth: AuthInternal): Promise<CordovaAuthEventManager> {
    const key = auth._key();
    let manager = this.eventManagers.get(key);
    if (!manager) {
      manager = new CordovaAuthEventManager(auth);
      this.eventManagers.set(key, manager);
      this.attachCallbackListeners(auth, manager);
    }
    return manager;
  }

  _openPopup(auth: AuthInternal): Promise<AuthPopup> {
    _fail(auth, AuthErrorCode.OPERATION_NOT_SUPPORTED);
  }

  async _openRedirect(
    auth: AuthInternal,
    provider: AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<void> {
    _checkCordovaConfiguration(auth);
    const manager = await this._initialize(auth);
    await manager.initialized();

    // Reset the persisted redirect states. This does not matter on Web where
    // the redirect always blows away application state entirely. On Cordova,
    // the app maintains control flow through the redirect.
    manager.resetRedirect();
    _clearRedirectOutcomes();

    await this._originValidation(auth);

    const event = _generateNewEvent(auth, authType, eventId);
    await _savePartialEvent(auth, event);
    const url = await _generateHandlerUrl(auth, event, provider);
    const iabRef = await _performRedirect(url);
    return _waitForAppResume(auth, manager, iabRef);
  }

  _isIframeWebStorageSupported(
    _auth: AuthInternal,
    _cb: (support: boolean) => unknown
  ): void {
    throw new Error('Method not implemented.');
  }

  _originValidation(auth: AuthInternal): Promise<void> {
    const key = auth._key();
    if (!this.originValidationPromises[key]) {
      this.originValidationPromises[key] = _validateOrigin(auth);
    }

    return this.originValidationPromises[key];
  }

  private attachCallbackListeners(
    auth: AuthInternal,
    manager: AuthEventManager
  ): void {
    // Get the global plugins
    const { universalLinks, handleOpenURL, BuildInfo } = _cordovaWindow();

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
    if (
      typeof universalLinks !== 'undefined' &&
      typeof universalLinks.subscribe === 'function'
    ) {
      universalLinks.subscribe(null, universalLinksCb);
    }

    // iOS 7 or 8 custom URL schemes.
    // This is also the current default behavior for iOS 9+.
    // For this to work, cordova-plugin-customurlscheme needs to be installed.
    // https://github.com/EddyVerbruggen/Custom-URL-scheme
    // Do not overwrite the existing developer's URL handler.
    const existingHandleOpenURL = handleOpenURL;
    const packagePrefix = `${BuildInfo.packageName.toLowerCase()}://`;
    _cordovaWindow().handleOpenURL = async url => {
      if (url.toLowerCase().startsWith(packagePrefix)) {
        // We want this intentionally to float
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        universalLinksCb({ url });
      }
      // Call the developer's handler if it is present.
      if (typeof existingHandleOpenURL === 'function') {
        try {
          existingHandleOpenURL(url);
        } catch (e) {
          // This is a developer error. Don't stop the flow of the SDK.
          console.error(e);
        }
      }
    };
  }
}

/**
 * An implementation of {@link PopupRedirectResolver} suitable for Cordova
 * based applications.
 *
 * @public
 */
export const cordovaPopupRedirectResolver: PopupRedirectResolver =
  CordovaPopupRedirectResolver;

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

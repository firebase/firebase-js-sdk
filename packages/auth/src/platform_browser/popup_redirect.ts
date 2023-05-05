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

import { AuthProvider, PopupRedirectResolver } from '../model/public_types';

import { AuthEventManager } from '../core/auth/auth_event_manager';
import { AuthErrorCode } from '../core/errors';
import { _assert, debugAssert, _fail } from '../core/util/assert';
import { _generateEventId } from '../core/util/event_id';
import { _getCurrentUrl } from '../core/util/location';
import { _validateOrigin } from '../core/util/validate_origin';
import { AuthInternal } from '../model/auth';
import {
  AuthEventType,
  EventManager,
  GapiAuthEvent,
  GapiOutcome,
  PopupRedirectResolverInternal
} from '../model/popup_redirect';
import { _setWindowLocation } from './auth_window';
import { _openIframe } from './iframe/iframe';
import { browserSessionPersistence } from './persistence/session_storage';
import { _open, AuthPopup } from './util/popup';
import { _getRedirectResult } from './strategies/redirect';
import { _getRedirectUrl } from '../core/util/handler';
import { _isIOS, _isMobileBrowser, _isSafari } from '../core/util/browser';
import { _overrideRedirectResult } from '../core/strategies/redirect';

/**
 * The special web storage event
 *
 */
const WEB_STORAGE_SUPPORT_KEY = 'webStorageSupport';

interface WebStorageSupportMessage extends gapi.iframes.Message {
  [index: number]: Record<string, boolean>;
}

interface ManagerOrPromise {
  manager?: EventManager;
  promise?: Promise<EventManager>;
}

class BrowserPopupRedirectResolver implements PopupRedirectResolverInternal {
  private readonly eventManagers: Record<string, ManagerOrPromise> = {};
  private readonly iframes: Record<string, gapi.iframes.Iframe> = {};
  private readonly originValidationPromises: Record<string, Promise<void>> = {};

  readonly _redirectPersistence = browserSessionPersistence;

  // Wrapping in async even though we don't await anywhere in order
  // to make sure errors are raised as promise rejections
  async _openPopup(
    auth: AuthInternal,
    provider: AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<AuthPopup> {
    debugAssert(
      this.eventManagers[auth._key()]?.manager,
      '_initialize() not called before _openPopup()'
    );

    const url = await _getRedirectUrl(
      auth,
      provider,
      authType,
      _getCurrentUrl(),
      eventId
    );
    return _open(auth, url, _generateEventId());
  }

  async _openRedirect(
    auth: AuthInternal,
    provider: AuthProvider,
    authType: AuthEventType,
    eventId?: string
  ): Promise<never> {
    await this._originValidation(auth);
    const url = await _getRedirectUrl(
      auth,
      provider,
      authType,
      _getCurrentUrl(),
      eventId
    );
    _setWindowLocation(url);
    return new Promise(() => {});
  }

  _initialize(auth: AuthInternal): Promise<EventManager> {
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

    // If the promise is rejected, the key should be removed so that the
    // operation can be retried later.
    promise.catch(() => {
      delete this.eventManagers[key];
    });

    return promise;
  }

  private async initAndGetManager(auth: AuthInternal): Promise<EventManager> {
    const iframe = await _openIframe(auth);
    const manager = new AuthEventManager(auth);
    iframe.register<GapiAuthEvent>(
      'authEvent',
      (iframeEvent: GapiAuthEvent | null) => {
        _assert(iframeEvent?.authEvent, auth, AuthErrorCode.INVALID_AUTH_EVENT);
        // TODO: Consider splitting redirect and popup events earlier on

        const handled = manager.onEvent(iframeEvent.authEvent);
        return { status: handled ? GapiOutcome.ACK : GapiOutcome.ERROR };
      },
      gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER
    );

    this.eventManagers[auth._key()] = { manager };
    this.iframes[auth._key()] = iframe;
    return manager;
  }

  _isIframeWebStorageSupported(
    auth: AuthInternal,
    cb: (supported: boolean) => unknown
  ): void {
    const iframe = this.iframes[auth._key()];
    iframe.send<gapi.iframes.Message, WebStorageSupportMessage>(
      WEB_STORAGE_SUPPORT_KEY,
      { type: WEB_STORAGE_SUPPORT_KEY },
      result => {
        const isSupported = result?.[0]?.[WEB_STORAGE_SUPPORT_KEY];
        if (isSupported !== undefined) {
          cb(!!isSupported);
        }

        _fail(auth, AuthErrorCode.INTERNAL_ERROR);
      },
      gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER
    );
  }

  _originValidation(auth: AuthInternal): Promise<void> {
    const key = auth._key();
    if (!this.originValidationPromises[key]) {
      this.originValidationPromises[key] = _validateOrigin(auth);
    }

    return this.originValidationPromises[key];
  }

  get _shouldInitProactively(): boolean {
    // Mobile browsers and Safari need to optimistically initialize
    return _isMobileBrowser() || _isSafari() || _isIOS();
  }

  _completeRedirectFn = _getRedirectResult;

  _overrideRedirectResult = _overrideRedirectResult;
}

/**
 * An implementation of {@link PopupRedirectResolver} suitable for browser
 * based applications.
 *
 * @remarks
 * This method does not work in a Node.js environment.
 *
 * @public
 */
export const browserPopupRedirectResolver: PopupRedirectResolver =
  BrowserPopupRedirectResolver;

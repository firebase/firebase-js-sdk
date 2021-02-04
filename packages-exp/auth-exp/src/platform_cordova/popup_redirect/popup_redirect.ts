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
  AuthEventType,
  EventManager,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { AuthPopup } from '../../platform_browser/util/popup';
import { _fail } from '../../core/util/assert';
import { AuthErrorCode } from '../../core/errors';
import {
  _checkCordovaConfiguration,
  _generateHandlerUrl,
  _generateNewEvent,
  _performRedirect
} from './utils';

class CordovaPopupRedirectResolver implements PopupRedirectResolver {
  readonly _redirectPersistence = browserSessionPersistence;
  _completeRedirectFn: () => Promise<null> = async () => null;

  _initialize(_auth: Auth): Promise<EventManager> {
    throw new Error('Method not implemented.');
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
}

/**
 * An implementation of {@link @firebase/auth-types#PopupRedirectResolver} suitable for Cordova
 * based applications.
 *
 * @public
 */
export const cordovaPopupRedirectResolver: externs.PopupRedirectResolver = CordovaPopupRedirectResolver;

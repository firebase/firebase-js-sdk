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

import * as externs from '@firebase/auth-types-exp';

import { Auth } from '../../model/auth';
import {
    AuthEvent, AuthEventConsumer, AuthEventType, EventFilter, EventManager, PopupRedirectResolver
} from '../../model/popup_redirect';
import { UserCredential } from '../../model/user';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { Delay } from '../util/delay';
import { _generateEventId } from '../util/event_id';
import { AuthPopup } from '../util/popup';
import * as idp from './idp';

const AUTH_EVENT_TIMEOUT = new Delay(2000, 2001);
const WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);

interface PendingPromise {
  resolve: (cred: UserCredential) => void;
  reject: (error: Error) => void;
}

export async function signInWithPopup(authExtern: externs.Auth, provider: externs.AuthProvider, resolverExtern: externs.PopupRedirectResolver) {
  const auth = authExtern as Auth;
  const resolver = resolverExtern as PopupRedirectResolver;

  const resultManager = new PopupResultManager(auth, AuthEventType.SIGN_IN_VIA_POPUP, idp._signIn, provider, resolver);
  const cred = await resultManager.getNewPendingPromise();

  await auth.updateCurrentUser(cred.user);
  return cred;
}

export class PopupResultManager implements AuthEventConsumer {
  private static pendingPromise: PendingPromise | null = null;
  private authWindow: AuthPopup | null = null;
  private pollId: number | null = null;
  private eventManager: EventManager | null = null;

  constructor(
      private readonly auth: Auth,
      readonly filter: AuthEventType,
      private readonly idpTask: idp.IdpTask,
      private readonly provider: externs.AuthProvider,
      private readonly resolver: PopupRedirectResolver) {
    
  }

  getNewPendingPromise(
  ): Promise<UserCredential> {
    if (PopupResultManager.pendingPromise) {
      // There was already a pending promise. Expire it.
      this.broadcastResult(
        null,
        AUTH_ERROR_FACTORY.create(AuthErrorCode.EXPIRED_POPUP_REQUEST, {
          appName: this.auth.name,
        })
      );
    }

    return new Promise<UserCredential>(async (resolve, reject) => {
      PopupResultManager.pendingPromise = { resolve, reject };

      this.eventManager = await this.resolver.initialize(this.auth);
      const eventId = _generateEventId();
      this.authWindow = await this.resolver.openPopup(this.auth, this.provider, AuthEventType.SIGN_IN_VIA_POPUP, eventId);
      this.authWindow.associatedEvent = eventId;

      this.eventManager.registerConsumer(this);

      // Handle user closure. Notice this does *not* use await
      this.pollUserCancellation(this.auth.name);
    });
  }

  isMatchingEvent(eventId: string | null): boolean {
    return !!eventId && this.authWindow?.associatedEvent === eventId;
  }

  async onAuthEvent(event: AuthEvent): Promise<void> {

    const { urlResponse, sessionId, postBody, tenantId, error } = event;
    if (error) {
      this.broadcastResult(null, error);
      return;
    }
    
    const params: idp.IdpTaskParams = {
      auth: this.auth,
      requestUri: urlResponse!,
      sessionId: sessionId!,
      tenantId: tenantId || undefined,
      postBody: postBody || undefined,
    };

    try {
      this.broadcastResult(await this.idpTask(params));
    } catch (e) {
      this.broadcastResult(null, e);
    }
  }

  private broadcastResult(cred: UserCredential | null, error?: Error) {
    if (this.authWindow) {
      this.authWindow.close();
    }

    if (this.pollId) {
      window.clearTimeout(this.pollId);
    }

    if (PopupResultManager.pendingPromise) {
      if (error) {
        PopupResultManager.pendingPromise.reject(error);
      } else {
        PopupResultManager.pendingPromise.resolve(cred!);
      }
    }

    this.cleanUp();
  }

  private cleanUp() {
    this.authWindow = null;
    PopupResultManager.pendingPromise = null;
    this.pollId = null;
    this.eventManager?.unregisterConsumer(this);
  }

  private pollUserCancellation(appName: string) {
    const poll = () => {
      if (this.authWindow?.window.closed) {
        this.pollId = window.setTimeout(() => {
          this.pollId = null;
          this.broadcastResult(
            null,
            AUTH_ERROR_FACTORY.create(AuthErrorCode.POPUP_CLOSED_BY_USER, {
              appName,
            })
          );
        }, AUTH_EVENT_TIMEOUT.get());
      }

      this.pollId = window.setTimeout(poll, WINDOW_CLOSE_TIMEOUT.get());
    };

    poll();
  }
}
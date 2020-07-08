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

import { FirebaseError } from '@firebase/util';

import { Auth } from '../../model/auth';
import {
    AuthEvent, AuthEventConsumer, AuthEventType, EventManager, PopupRedirectResolver
} from '../../model/popup_redirect';
import { User, UserCredential } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { fail } from '../util/assert';
import { _link, _reauth, _signIn, IdpTask, IdpTaskParams } from './idp';

interface PendingPromise {
  resolve: (cred: UserCredential) => void;
  reject: (error: Error) => void;
}

/**
 * Popup event manager. Handles the popup's entire lifecycle; listens to auth
 * events
 */
export abstract class AbstractPopupRedirectAction implements AuthEventConsumer {
  private pendingPromise: PendingPromise | null = null;
  private eventManager: EventManager | null = null;
  
  abstract eventId: string|null;

  constructor(
    protected readonly auth: Auth,
    readonly filter: AuthEventType,
    protected readonly resolver: PopupRedirectResolver,
    protected user?: User
  ) {
  }

  abstract onExecution(): Promise<void>;

  execute(): Promise<UserCredential> {
    return new Promise<UserCredential>(async (resolve, reject) => {
      this.pendingPromise = { resolve, reject };

      this.eventManager = await this.resolver._initialize(this.auth);
      await this.onExecution();
      this.eventManager.registerConsumer(this);
    });
  }

  async onAuthEvent(event: AuthEvent): Promise<void> {
    const { urlResponse, sessionId, postBody, tenantId, error, type } = event;
    if (error) {
      this.broadcastResult(null, error);
      return;
    }

    const params: IdpTaskParams = {
      auth: this.auth,
      requestUri: urlResponse!,
      sessionId: sessionId!,
      tenantId: tenantId || undefined,
      postBody: postBody || undefined,
      user: this.user
    };

    try {
      this.broadcastResult(await this.getIdpTask(type)(params));
    } catch (e) {
      this.broadcastResult(null, e);
    }
  }

  onError(error: FirebaseError): void {
    this.broadcastResult(null, error);
  }

  isMatchingEvent(eventId: string|null): boolean {
    return !!eventId && this.eventId === eventId;
  }

  private getIdpTask(type: AuthEventType): IdpTask {
    switch(type) {
      case AuthEventType.SIGN_IN_VIA_POPUP:
      case AuthEventType.SIGN_IN_VIA_REDIRECT:
        return _signIn;
      case AuthEventType.LINK_VIA_POPUP:
      case AuthEventType.LINK_VIA_REDIRECT:
        return _link;
      case AuthEventType.REAUTH_VIA_POPUP:
      case AuthEventType.REAUTH_VIA_REDIRECT:
        return _reauth;
      default:
        fail(this.auth.name, AuthErrorCode.INTERNAL_ERROR);
    }
  }

  protected broadcastResult(cred: UserCredential | null, error?: Error): void {
    if (this.pendingPromise) {
      if (error) {
        this.pendingPromise.reject(error);
      } else {
        this.pendingPromise.resolve(cred!);
      }
    }

    this.pendingPromise = null;
    if (this.eventManager) {
      this.eventManager.unregisterConsumer(this);
    }
    this.cleanUp();
  }

  abstract cleanUp(): void;
}

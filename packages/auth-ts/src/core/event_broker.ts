/**
 * @license
 * Copyright 2019 Google Inc.
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

import { EventSubscriber, PopupRedirectResolver } from '../model/popup_redirect_resolver';
import { AuthEvent, EventProcessor, AuthEventType } from '../model/auth_event';
import { redirectEventProcessors } from './strategies/redirect';
import { Auth } from '../model/auth';
import { UserCredential } from '../model/user_credential';

interface PendingPromise {
  resolve: (cred: UserCredential|null) => void;
  reject: (error: Error) => void;
}

class EventBroker implements EventSubscriber {
  private auth!: Auth;
  private redirectOutcome: (() => Promise<UserCredential|null>)|null = null;
  private readonly redirectListeners: PendingPromise[] = [];

  async onEvent(event: AuthEvent): Promise<boolean> {
    let processor: EventProcessor;
    let isRedirect = false;
    switch (event.type) {
      case AuthEventType.SIGN_IN_VIA_REDIRECT:
        processor = redirectEventProcessors.signIn;
        isRedirect = true;
        break;
    }

    const {
      urlResponse,
      sessionId,
      postBody,
      tenantId,
    } = event;

    try {
      const userCred = await processor!(this.auth, urlResponse!, sessionId!, tenantId!, postBody!);
      if (isRedirect) {
        this.broadcastRedirectResult(userCred);
      }
      return true;
    } catch (e) {
      if (isRedirect) {
        this.broadcastRedirectResult(null, e);
      }
      return false;
    }
  }

  getRedirectResult(auth: Auth, resolver: PopupRedirectResolver): Promise<UserCredential|null> {
    // TODO: This is trash;
    this.auth = auth;
    if (this.redirectOutcome) {
      return this.redirectOutcome();
    }

    return new Promise<UserCredential|null>((resolve, reject) => {
      if (!resolver.isInitialized()) {
        resolver.initializeAndWait(auth);
      }

      this.redirectListeners.push({resolve, reject});
    });
  }

  private broadcastRedirectResult(cred: UserCredential|null, error?: Error) {
    for (const listener of this.redirectListeners) {
      if (error) {
        listener.reject(error);
      } else {
        listener.resolve(cred);
      }
    }

    this.redirectOutcome = () => {
      return error ? Promise.reject(error) : Promise.resolve(cred);
    }
  }
}

export const eventBroker = new EventBroker();

export function getRedirectResult(auth: Auth, resolver?: PopupRedirectResolver): Promise<UserCredential|null> {
  return eventBroker.getRedirectResult(auth, resolver || auth.popupRedirectResolver!);
}
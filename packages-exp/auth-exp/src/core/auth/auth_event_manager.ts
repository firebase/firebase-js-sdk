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

import {
    AuthEvent, AuthEventConsumer, AuthEventType, EventManager
} from '../../model/popup_redirect';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';

export class AuthEventManager implements EventManager {
  private readonly consumers: Set<AuthEventConsumer> = new Set();
  private queuedRedirectEvent: AuthEvent | null = null;
  private hasHandledPotentialRedirect = false;

  constructor(private readonly appName: string) {}

  registerConsumer(authEventConsumer: AuthEventConsumer): void {
    this.consumers.add(authEventConsumer);

    if (this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, authEventConsumer)) {
      this.sendToConsumer(this.queuedRedirectEvent, authEventConsumer);
      this.queuedRedirectEvent = null;
    }
  }

  unregisterConsumer(authEventConsumer: AuthEventConsumer): void {
    this.consumers.delete(authEventConsumer);
  }

  onEvent(event: AuthEvent): boolean {
    let handled = false;
    this.consumers.forEach(consumer => {
      if (this.isEventForConsumer(event, consumer)) {
        handled = true;
        this.sendToConsumer(event, consumer);
      }
    });

    // The redirect event is always available immediately, unlike popup
    // events (which happen in the normal app lifetime). Since the user
    // may open the iframe (through a popup method) before getRedirectResult()
    // is called, we need to queue up the redirect event so the user has access
    // to it later. On the other hand, if we get a "unknown" auth event with
    // the message "no-auth-event", we know there will never be a redirect event
    // for this session.
    if (event.type === AuthEventType.UNKNOWN && event.error?.code === `auth/${AuthErrorCode.NO_AUTH_EVENT}`) {
      this.hasHandledPotentialRedirect = true;
      return true;

    } else if (!handled && isRedirectEvent(event.type) && !this.hasHandledPotentialRedirect) {
      this.queuedRedirectEvent = event;
      handled = true;
    }

    this.hasHandledPotentialRedirect = this.hasHandledPotentialRedirect || isRedirectEvent(event.type);

    return handled;
  }

  private sendToConsumer(event: AuthEvent, consumer: AuthEventConsumer): void {
    if (event.error) {
      console.error('ERROR');
      const code =
        (event.error.code?.split('auth/')[1] as AuthErrorCode) ||
        AuthErrorCode.INTERNAL_ERROR;
      consumer.onError(
        AUTH_ERROR_FACTORY.create(code, {
          appName: this.appName
        })
      );
    } else {
      consumer.onAuthEvent(event);
    }
  }

  private isEventForConsumer(event: AuthEvent, consumer: AuthEventConsumer): boolean {
    const eventIdMatches = consumer.eventId === null || (!!event.eventId && event.eventId === consumer.eventId);
    return consumer.filter.includes(event.type) && eventIdMatches;
  }
}

function isRedirectEvent(type: AuthEventType): boolean {
  switch (type) {
    case AuthEventType.SIGN_IN_VIA_REDIRECT:
    case AuthEventType.LINK_VIA_REDIRECT:
    case AuthEventType.REAUTH_VIA_REDIRECT:
      return true;
    default:
      return false;
  }
}

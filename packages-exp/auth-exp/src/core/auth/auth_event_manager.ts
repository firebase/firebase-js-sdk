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
  AuthEvent,
  AuthEventConsumer,
  AuthEventType,
  EventManager
} from '../../model/popup_redirect';
import { AuthErrorCode } from '../errors';
import { AuthInternal } from '../../model/auth';
import { _createError } from '../util/assert';

// The amount of time to store the UIDs of seen events; this is
// set to 10 min by default
const EVENT_DUPLICATION_CACHE_DURATION_MS = 10 * 60 * 1000;

export class AuthEventManager implements EventManager {
  private readonly cachedEventUids: Set<string> = new Set();
  private readonly consumers: Set<AuthEventConsumer> = new Set();
  protected queuedRedirectEvent: AuthEvent | null = null;
  protected hasHandledPotentialRedirect = false;
  private lastProcessedEventTime = Date.now();

  constructor(private readonly auth: AuthInternal) {}

  registerConsumer(authEventConsumer: AuthEventConsumer): void {
    this.consumers.add(authEventConsumer);

    if (
      this.queuedRedirectEvent &&
      this.isEventForConsumer(this.queuedRedirectEvent, authEventConsumer)
    ) {
      this.sendToConsumer(this.queuedRedirectEvent, authEventConsumer);
      this.saveEventToCache(this.queuedRedirectEvent);
      this.queuedRedirectEvent = null;
    }
  }

  unregisterConsumer(authEventConsumer: AuthEventConsumer): void {
    this.consumers.delete(authEventConsumer);
  }

  onEvent(event: AuthEvent): boolean {
    // Check if the event has already been handled
    if (this.hasEventBeenHandled(event)) {
      return false;
    }

    let handled = false;
    this.consumers.forEach(consumer => {
      if (this.isEventForConsumer(event, consumer)) {
        handled = true;
        this.sendToConsumer(event, consumer);
        this.saveEventToCache(event);
      }
    });

    if (this.hasHandledPotentialRedirect || !isRedirectEvent(event)) {
      // If we've already seen a redirect before, or this is a popup event,
      // bail now
      return handled;
    }

    this.hasHandledPotentialRedirect = true;

    // If the redirect wasn't handled, hang on to it
    if (!handled) {
      this.queuedRedirectEvent = event;
      handled = true;
    }

    return handled;
  }

  private sendToConsumer(event: AuthEvent, consumer: AuthEventConsumer): void {
    if (event.error && !isNullRedirectEvent(event)) {
      const code =
        (event.error.code?.split('auth/')[1] as AuthErrorCode) ||
        AuthErrorCode.INTERNAL_ERROR;
      consumer.onError(_createError(this.auth, code));
    } else {
      consumer.onAuthEvent(event);
    }
  }

  private isEventForConsumer(
    event: AuthEvent,
    consumer: AuthEventConsumer
  ): boolean {
    const eventIdMatches =
      consumer.eventId === null ||
      (!!event.eventId && event.eventId === consumer.eventId);
    return consumer.filter.includes(event.type) && eventIdMatches;
  }

  private hasEventBeenHandled(event: AuthEvent): boolean {
    if (
      Date.now() - this.lastProcessedEventTime >=
      EVENT_DUPLICATION_CACHE_DURATION_MS
    ) {
      this.cachedEventUids.clear();
    }

    return this.cachedEventUids.has(eventUid(event));
  }

  private saveEventToCache(event: AuthEvent): void {
    this.cachedEventUids.add(eventUid(event));
    this.lastProcessedEventTime = Date.now();
  }
}

function eventUid(e: AuthEvent): string {
  return [e.type, e.eventId, e.sessionId, e.tenantId].filter(v => v).join('-');
}

function isNullRedirectEvent({ type, error }: AuthEvent): boolean {
  return (
    type === AuthEventType.UNKNOWN &&
    error?.code === `auth/${AuthErrorCode.NO_AUTH_EVENT}`
  );
}

function isRedirectEvent(event: AuthEvent): boolean {
  switch (event.type) {
    case AuthEventType.SIGN_IN_VIA_REDIRECT:
    case AuthEventType.LINK_VIA_REDIRECT:
    case AuthEventType.REAUTH_VIA_REDIRECT:
      return true;
    case AuthEventType.UNKNOWN:
      return isNullRedirectEvent(event);
    default:
      return false;
  }
}

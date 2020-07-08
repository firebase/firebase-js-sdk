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
  EventManager
} from '../../model/popup_redirect';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';

export class AuthEventManager implements EventManager {
  private readonly consumers: Set<AuthEventConsumer> = new Set();

  constructor(private readonly appName: string) {}

  registerConsumer(authEventConsumer: AuthEventConsumer): void {
    this.consumers.add(authEventConsumer);
  }

  unregisterConsumer(authEventConsumer: AuthEventConsumer): void {
    this.consumers.delete(authEventConsumer);
  }

  onEvent(event: AuthEvent): void {
    this.consumers.forEach(consumer => {
      if (
        consumer.filter === event.type &&
        consumer.isMatchingEvent(event.eventId)
      ) {
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
    });
  }
}

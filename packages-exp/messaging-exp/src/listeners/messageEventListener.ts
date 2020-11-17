/**
 * @license
 * Copyright 2017 Google LLC
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
  MessagePayloadInternal,
  MessageType
} from '../interfaces/internal-message-payload';

import { CONSOLE_CAMPAIGN_ANALYTICS_ENABLED } from '../util/constants';
import { MessagingService } from '../messaging-service';
import { _FirebaseService } from '@firebase/app-types-exp';
import { externalizePayload } from '../helpers/externalizePayload';
import { isConsoleMessage } from '../helpers/is-console-message';
import { logToScion } from '../helpers/logToScion';

export async function messageEventListener(
  messaging: MessagingService,
  event: MessageEvent
): Promise<void> {
  const internalPayload = event.data as MessagePayloadInternal;

  if (!internalPayload.isFirebaseMessaging) {
    return;
  }

  if (
    messaging.onMessageHandler &&
    internalPayload.messageType === MessageType.PUSH_RECEIVED
  ) {
    if (typeof messaging.onMessageHandler === 'function') {
      messaging.onMessageHandler(externalizePayload(internalPayload));
    } else {
      messaging.onMessageHandler.next(externalizePayload(internalPayload));
    }
  }

  // Log to Scion if applicable
  const dataPayload = internalPayload.data;
  if (
    isConsoleMessage(dataPayload) &&
    dataPayload[CONSOLE_CAMPAIGN_ANALYTICS_ENABLED] === '1'
  ) {
    await logToScion(messaging, internalPayload.messageType!, dataPayload);
  }
}

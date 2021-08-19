/**
 * @license
 * Copyright 2019 Google LLC
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
  CONSOLE_CAMPAIGN_ID,
  CONSOLE_CAMPAIGN_NAME,
  CONSOLE_CAMPAIGN_TIME
} from '../util/constants';
import {
  ConsoleMessageData,
  MessageType
} from '../interfaces/internal-message-payload';

import { MessagingService } from '../messaging-service';

export async function logToScion(
  messaging: MessagingService,
  messageType: MessageType,
  data: ConsoleMessageData
): Promise<void> {
  const eventType = getEventType(messageType);
  const analytics = await messaging.firebaseDependencies.analyticsProvider.get();
  analytics.logEvent(eventType, {
    /* eslint-disable camelcase */
    message_id: data[CONSOLE_CAMPAIGN_ID],
    message_name: data[CONSOLE_CAMPAIGN_NAME],
    message_time: data[CONSOLE_CAMPAIGN_TIME],
    message_device_time: Math.floor(Date.now() / 1000)
    /* eslint-enable camelcase */
  });
}

function getEventType(messageType: MessageType): string {
  switch (messageType) {
    case MessageType.NOTIFICATION_CLICKED:
      return 'notification_open';
    case MessageType.PUSH_RECEIVED:
      return 'notification_foreground';
    default:
      throw new Error();
  }
}

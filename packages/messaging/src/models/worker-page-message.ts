/**
 * @license
 * Copyright 2017 Google Inc.
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

import { MessagePayload } from '../interfaces/message-payload';

export enum MessageParameter {
  TYPE_OF_MSG = 'firebase-messaging-msg-type',
  DATA = 'firebase-messaging-msg-data'
}

export enum MessageType {
  PUSH_MSG_RECEIVED = 'push-msg-received',
  NOTIFICATION_CLICKED = 'notification-clicked'
}

export interface InternalMessage {
  [MessageParameter.TYPE_OF_MSG]: MessageType;
  [MessageParameter.DATA]: MessagePayload;
}

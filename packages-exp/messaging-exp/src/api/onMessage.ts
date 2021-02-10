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

import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';

import { MessagePayload } from '@firebase/messaging-types-exp';
import { MessagingService } from '../messaging-service';
import { messageEventListener } from '../listeners/messageEventListener';

export function onMessage(
  messaging: MessagingService,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  if (!navigator) {
    throw ERROR_FACTORY.create(ErrorCode.AVAILABLE_IN_WINDOW);
  }

  navigator.serviceWorker.addEventListener('message', e =>
    messageEventListener(messaging, e)
  );

  messaging.onMessageHandler = nextOrObserver;

  return () => {
    messaging.onMessageHandler = null;
  };
}

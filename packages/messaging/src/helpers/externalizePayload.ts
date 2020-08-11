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

import { MessagePayload } from '@firebase/messaging-types';
import { MessagePayloadInternal } from '../interfaces/internal-message-payload';

export function externalizePayload(
  internalPayload: MessagePayloadInternal
): MessagePayload {
  const payload: MessagePayload = {
    from: internalPayload.from,
    // eslint-disable-next-line camelcase
    collapseKey: internalPayload.collapse_key
  } as MessagePayload;

  propagateNotificationPayload(payload, internalPayload);
  propagateDataPayload(payload, internalPayload);
  propagateFcmOptions(payload, internalPayload);

  return payload;
}

function propagateNotificationPayload(
  payload: MessagePayload,
  messagePayloadInternal: MessagePayloadInternal
): void {
  if (!messagePayloadInternal.notification) {
    return;
  }

  payload.notification = {};

  const title = messagePayloadInternal.notification!.title;
  if (!!title) {
    payload.notification!.title = title;
  }

  const body = messagePayloadInternal.notification!.body;
  if (!!body) {
    payload.notification!.body = body;
  }

  const image = messagePayloadInternal.notification!.image;
  if (!!image) {
    payload.notification!.image = image;
  }
}

function propagateDataPayload(
  payload: MessagePayload,
  messagePayloadInternal: MessagePayloadInternal
): void {
  if (!messagePayloadInternal.data) {
    return;
  }

  payload.data = messagePayloadInternal.data as { [key: string]: string };
}

function propagateFcmOptions(
  payload: MessagePayload,
  messagePayloadInternal: MessagePayloadInternal
): void {
  if (!messagePayloadInternal.fcmOptions) {
    return;
  }

  payload.fcmOptions = {};

  const link = messagePayloadInternal.fcmOptions!.link;
  if (!!link) {
    payload.fcmOptions!.link = link;
  }

  // eslint-disable-next-line camelcase
  const analyticsLabel = messagePayloadInternal.fcmOptions!.analytics_label;
  if (!!analyticsLabel) {
    payload.fcmOptions!.analyticsLabel = analyticsLabel;
  }
}

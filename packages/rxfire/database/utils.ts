/**
 * @license
 * Copyright 2018 Google LLC
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

import { ListenEvent } from './interfaces';

/**
 * Check the length of the provided array. If it is empty return an array
 * that is populated with all the Realtime Database child events.
 * @param events
 */
export function validateEventsArray(events?: ListenEvent[]): ListenEvent[] {
  if (events == null || events.length === 0) {
    events = [
      ListenEvent.added,
      ListenEvent.removed,
      ListenEvent.changed,
      ListenEvent.moved
    ];
  }
  return events;
}

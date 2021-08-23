/**
 * @license
 * Copyright 2021 Google LLC
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

import { errorPrefix as errorPrefixFxn } from '@firebase/util';

export const validateBoolean = function (
  fnName: string,
  argumentName: string,
  bool: unknown,
  optional: boolean
) {
  if (optional && bool === undefined) {
    return;
  }
  if (typeof bool !== 'boolean') {
    throw new Error(
      errorPrefixFxn(fnName, argumentName) + 'must be a boolean.'
    );
  }
};

export const validateEventType = function (
  fnName: string,
  eventType: string,
  optional: boolean
) {
  if (optional && eventType === undefined) {
    return;
  }

  switch (eventType) {
    case 'value':
    case 'child_added':
    case 'child_removed':
    case 'child_changed':
    case 'child_moved':
      break;
    default:
      throw new Error(
        errorPrefixFxn(fnName, 'eventType') +
          'must be a valid event type = "value", "child_added", "child_removed", ' +
          '"child_changed", or "child_moved".'
      );
  }
};

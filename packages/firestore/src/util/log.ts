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

import { Logger, LogLevel } from '@firebase/logger';
import { SDK_VERSION } from '../core/version';
import { PlatformSupport } from '../platform/platform';

export { LogLevel };

const logClient = new Logger('@firebase/firestore');

// Helper methods are needed because variables can't be exported as read/write
export function getLogLevel(): LogLevel {
  return logClient.logLevel;
}

export function setLogLevel(newLevel: LogLevel): void {
  logClient.logLevel = newLevel;
}

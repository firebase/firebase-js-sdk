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
import { version } from '../../../packages/firebase/package.json';
import { LogLevel } from '@firebase/logger';
export const SDK_VERSION = version;
export function bar(): LogLevel {
  return bar1();
}

export function bar1(): LogLevel {
  return LogLevel.DEBUG;
}

export function bar2(): string {
  return bar1().toLocaleString() + bar();
}

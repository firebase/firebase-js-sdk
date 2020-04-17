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

import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';

export function assert<T>(
  expression: T | null | undefined,
  appName: string
): T {
  if (!expression) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, { appName });
  }

  return expression;
}

export function assertType<T>(
  expression: unknown,
  expected: string | string[],
  appName: string
): T {
  if (typeof expected === 'string') {
    expected = [expected];
  }

  assert(expected.includes(typeof expression), appName);
  return expression as T;
}

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

type Keys<T> = Extract<keyof T, string>;
type Values<T> = T[keyof T];

export function contains<T extends object>(obj: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function safeGet<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  } else {
    return undefined;
  }
}

export function isEmpty(obj: object): obj is {} {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}

export function map<T extends object, V, U extends { [key in keyof T]: V }>(
  obj: T,
  fn: (value: Values<T>, key: Keys<T>, obj: T) => V,
  opt_obj?: unknown
): U {
  const res: Partial<U> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      res[key] = fn.call(opt_obj, obj[key], key, obj);
    }
  }
  return res as U;
}

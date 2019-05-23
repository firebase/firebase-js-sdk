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

/**
 * Enumerates the keys/values in an object, excluding keys defined on the prototype.
 *
 * @param obj Object to enumerate.
 * @param fn Function to call for each key and value.
 */
export function forEach<T extends object>(
  obj: T,
  fn: (key: Keys<T>, value: Values<T>) => void
) {
  for (const key of Object.keys(obj)) {
    // Object.keys() doesn't return an Array<keyof T>
    // https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208
    fn(key as Keys<T>, obj[key as Keys<T>]);
  }
}

/**
 * Copies all the (own) properties from one object to another.
 */
export function extend<T extends object, U extends object>(
  objTo: T,
  objFrom: U
): T & U {
  return Object.assign(objTo, objFrom);
}

/**
 * Returns a clone of the specified object.
 * @return cloned obj.
 */
export function clone<T extends object>(obj: T): T {
  return { ...obj };
}

/**
 * Returns true if obj has typeof "object" and is not null.  Unlike goog.isObject(),
 * does not return true for functions.
 */
export function isNonNullObject(obj: unknown): obj is object {
  return typeof obj === 'object' && obj !== null;
}

export function isEmpty(obj: object): obj is {} {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}

export function getCount(obj: object): number {
  return Object.keys(obj).length;
}

export function map<T extends object, V, U extends { [key in keyof T]: V }>(
  obj: T,
  fn: (value: Values<T>, key: Keys<T>, obj: T) => V,
  opt_obj?: unknown
): U {
  const res: Partial<U> = {};
  for (const [key, value] of Object.entries(obj)) {
    res[key as Keys<T>] = fn.call(opt_obj, value, key, obj);
  }
  return res as U;
}

export function findKey<T extends object>(
  obj: T,
  fn: <K extends Keys<T>>(value: T[K], key: K, obj: T) => boolean,
  opt_this?: unknown
): keyof T | undefined {
  for (const [key, value] of Object.entries(obj)) {
    if (fn.call(opt_this, value, key, obj)) {
      return key as keyof T;
    }
  }
  return undefined;
}

export function findValue<T extends object>(
  obj: T,
  fn: (value: Values<T>, key: Keys<T>, obj: T) => boolean,
  opt_this?: unknown
): Values<T> | undefined {
  const key = findKey(obj, fn, opt_this);
  return key && obj[key];
}

export function getAnyKey<T extends object>(obj: T): keyof T | undefined {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return key;
    }
  }
  return undefined;
}

/**
 * Tests whether every key/value pair in an object pass the test implemented
 * by the provided function
 *
 * @param obj Object to test.
 * @param fn Function to call for each key and value.
 */
export function every<T extends object>(
  obj: T,
  fn: (key: Keys<T>, value: Values<T>) => boolean
): boolean {
  for (const [key, value] of Object.entries(obj)) {
    if (!fn(key as Keys<T>, value)) {
      return false;
    }
  }
  return true;
}

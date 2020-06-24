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

import { Code, FirestoreError } from './error';

/** List of JavaScript builtins that cannot be reassigned. */
const RESERVED_READONLY_PROPS = ['length', 'name'];

/**
 * Helper function to prevent instantiation through the constructor.
 *
 * This method creates a new constructor that throws when it's invoked.
 * The prototype of that constructor is then set to the prototype of the hidden
 * "class" to expose all the prototype methods and allow for instanceof
 * checks.
 *
 * To also make all the static methods available, all properties of the
 * original constructor are copied to the new constructor.
 */
export function makeConstructorPrivate<T extends Function>(
  cls: T,
  optionalMessage?: string
): T {
  function PublicConstructor(): never {
    let error = 'This constructor is private.';
    if (optionalMessage) {
      error += ' ';
      error += optionalMessage;
    }
    throw new FirestoreError(Code.INVALID_ARGUMENT, error);
  }

  // Copy static members and prototype
  for (const staticProp of Object.getOwnPropertyNames(cls)) {
    if (RESERVED_READONLY_PROPS.indexOf(staticProp) === -1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (PublicConstructor as any)[staticProp] = (cls as any)[staticProp];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PublicConstructor as any;
}

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
/**
 * @fileoverview Standardized Firebase Error.
 *
 * Usage:
 *
 *   // Typescript string literals for type-safe codes
 *   type Err =
 *     'unknown' |
 *     'object-not-found'
 *     ;
 *
 *   // Closure enum for type-safe error codes
 *   // at-enum {string}
 *   var Err = {
 *     UNKNOWN: 'unknown',
 *     OBJECT_NOT_FOUND: 'object-not-found',
 *   }
 *
 *   let errors: Map<Err, string> = {
 *     'generic-error': "Unknown error",
 *     'file-not-found': "Could not find file: {$file}",
 *   };
 *
 *   // Type-safe function - must pass a valid error code as param.
 *   let error = new ErrorFactory<Err>('service', 'Service', errors);
 *
 *   ...
 *   throw error.create(Err.GENERIC);
 *   ...
 *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
 *   ...
 *   // Service: Could not file file: foo.txt (service/file-not-found).
 *
 *   catch (e) {
 *     assert(e.message === "Could not find file: foo.txt.");
 *     if (e.code === 'service/file-not-found') {
 *       console.log("Could not read file: " + e['file']);
 *     }
 *   }
 */

export type ErrorMap<ErrorCode extends string> = {
  readonly [K in ErrorCode]: string;
};

const ERROR_NAME = 'FirebaseError';

export interface StringLike {
  toString(): string;
}

export interface ErrorData {
  [key: string]: unknown;
}

export interface FirebaseError extends Error, ErrorData {
  // Unique code for error - format is service/error-code-string.
  readonly code: string;

  // Developer-friendly error message.
  readonly message: string;

  // Always 'FirebaseError'.
  readonly name: typeof ERROR_NAME;

  // Where available - stack backtrace in a string.
  readonly stack?: string;
}

// Based on code from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
export class FirebaseError extends Error {
  readonly name = ERROR_NAME;

  constructor(readonly code: string, message: string) {
    super(message);

    // Fix For ES5
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, FirebaseError.prototype);

    // Maintains proper stack trace for where our error was thrown.
    // Only available on V8.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorFactory.prototype.create);
    }
  }
}

export class ErrorFactory<
  ErrorCode extends string,
  ErrorParams extends { readonly [K in ErrorCode]?: ErrorData } = {}
> {
  constructor(
    private readonly service: string,
    private readonly serviceName: string,
    private readonly errors: ErrorMap<ErrorCode>
  ) {}

  create<K extends ErrorCode>(
    code: K,
    ...data: K extends keyof ErrorParams ? [ErrorParams[K]] : []
  ): FirebaseError {
    const customData = (data[0] as ErrorData) || {};
    const fullCode = `${this.service}/${code}`;
    const template = this.errors[code];

    const message = template ? replaceTemplate(template, customData) : 'Error';
    // Service Name: Error message (service/code).
    const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;

    const error = new FirebaseError(fullCode, fullMessage);

    // Keys with an underscore at the end of their name are not included in
    // error.data for some reason.
    // TODO: Replace with Object.entries when lib is updated to es2017.
    for (const key of Object.keys(customData)) {
      if (key.slice(-1) !== '_') {
        if (key in error) {
          console.warn(
            `Overwriting FirebaseError base field "${key}" can cause unexpected behavior.`
          );
        }
        error[key] = customData[key];
      }
    }

    return error;
  }
}

function replaceTemplate(template: string, data: ErrorData): string {
  return template.replace(PATTERN, (_, key) => {
    const value = data[key];
    return value != null ? String(value) : `<${key}?>`;
  });
}

const PATTERN = /\{\$([^}]+)}/g;

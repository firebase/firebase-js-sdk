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
 *   // TypeScript string literals for type-safe codes
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
 *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
 *       console.log("Could not read file: " + e['file']);
 *     }
 *   }
 */

import { decode } from './jwt';
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

let contextualErrorsEnabled = false;

export function enableContextualErrors(enabled: boolean): void {
  contextualErrorsEnabled = enabled;
}

export function isContextualErrorsEnabled(): boolean {
  return contextualErrorsEnabled;
}

// Based on code from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
export class FirebaseError<T = Record<string, unknown>> extends Error {
  /** The custom name for all FirebaseErrors. */
  readonly name: string = ERROR_NAME;

  constructor(
    /** The error code for this error. */
    readonly code: string,
    message: string,
    /** Custom data for this error. */
    public customData?: T
  ) {
    super(message);
    // Fix For ES5
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // TODO(dlarocque): Replace this with `new.target`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    //                   which we can now use since we no longer target ES5.
    Object.setPrototypeOf(this, FirebaseError.prototype);

    // Maintains proper stack trace for where our error was thrown.
    // Only available on V8.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorFactory.prototype.create);
    }
  }
}

export function getContextualMsg<
  T extends { authInfo: ErrorAuthInfo | null },
  E extends FirebaseError<T>
>(originalError: E): string {
  if (!isContextualErrorsEnabled() || !originalError.customData) {
    return originalError.message;
  }

  const { authInfo, ...rest } = originalError.customData;

  let restStr: string = '';
  try {
    restStr = JSON.stringify(rest);
  } catch {}

  let authInfoStr = '';
  if (authInfo) {
    try {
      authInfoStr = JSON.stringify(authInfo);
    } catch {}
  }

  return `${originalError.message} Extra Context: ${restStr} ${
    authInfo ? `AuthInfo: ${authInfoStr}` : ''
  }`;
}

export function parseIdTokenToAuthInfo(idToken: string): ErrorAuthInfo {
  const tokenInfo = decode(idToken);
  return {
    userId: tokenInfo.claims['user_id'] as string,
    email: tokenInfo.claims['email'] as string,
    emailVerified: tokenInfo.claims['email_verified'] as boolean,
    isAnonymous: tokenInfo.claims['provider_id'] === 'anonymous'
  };
}

export interface ErrorAuthInfo {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
}

export interface AuthInfo {
  authInfo: ErrorAuthInfo | null;
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

    const error = new FirebaseError(fullCode, fullMessage, customData);

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


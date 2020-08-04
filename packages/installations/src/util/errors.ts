/**
 * @license
 * Copyright 2019 Google LLC
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

import { ErrorFactory, FirebaseError } from '@firebase/util';
import { SERVICE, SERVICE_NAME } from './constants';

export const enum ErrorCode {
  MISSING_APP_CONFIG_VALUES = 'missing-app-config-values',
  INVALID_APP_ID_FORMAT = 'invalid-app-id-format',
  INVALID_API_KEY_FORMAT = 'invalid-api-key-format',
  NOT_REGISTERED = 'not-registered',
  INSTALLATION_NOT_FOUND = 'installation-not-found',
  REQUEST_FAILED = 'request-failed',
  APP_OFFLINE = 'app-offline',
  DELETE_PENDING_REGISTRATION = 'delete-pending-registration'
}

const ERROR_DESCRIPTION_MAP: { readonly [key in ErrorCode]: string } = {
  [ErrorCode.MISSING_APP_CONFIG_VALUES]:
    'Missing App configuration value: "{$valueName}"',
  [ErrorCode.INVALID_APP_ID_FORMAT]:
    'Please set your Application ID. A valid Firebase App ID is required to communicate ' +
    'with Firebase server APIs: It identifies your application with Firebase.' +
    'Please refer to https://firebase.google.com/support/privacy/init-options.',
  [ErrorCode.INVALID_API_KEY_FORMAT]:
    'Please set a valid API key. A Firebase API key is required to communicate with ' +
    'Firebase server APIs: It authenticates your project with Google.' +
    'Please refer to https://firebase.google.com/support/privacy/init-options.',
  [ErrorCode.NOT_REGISTERED]: 'Firebase Installation is not registered.',
  [ErrorCode.INSTALLATION_NOT_FOUND]: 'Firebase Installation not found.',
  [ErrorCode.REQUEST_FAILED]:
    '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
  [ErrorCode.APP_OFFLINE]: 'Could not process request. Application offline.',
  [ErrorCode.DELETE_PENDING_REGISTRATION]:
    "Can't delete installation while there is a pending registration request."
};

interface ErrorParams {
  [ErrorCode.MISSING_APP_CONFIG_VALUES]: {
    valueName: string;
  };
  [ErrorCode.REQUEST_FAILED]: {
    requestName: string;
    [index: string]: string | number; // to make Typescript 3.8 happy
  } & ServerErrorData;
}

export const ERROR_FACTORY = new ErrorFactory<ErrorCode, ErrorParams>(
  SERVICE,
  SERVICE_NAME,
  ERROR_DESCRIPTION_MAP
);

export interface ServerErrorData {
  serverCode: number;
  serverMessage: string;
  serverStatus: string;
}

export type ServerError = FirebaseError & ServerErrorData;

/** Returns true if error is a FirebaseError that is based on an error from the server. */
export function isServerError(error: unknown): error is ServerError {
  return (
    error instanceof FirebaseError &&
    error.code.includes(ErrorCode.REQUEST_FAILED)
  );
}

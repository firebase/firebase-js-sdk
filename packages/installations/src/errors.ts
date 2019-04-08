/**
 * @license
 * Copyright 2019 Google Inc.
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

import { ErrorFactory } from '@firebase/util';
import { SERVICE, SERVICE_NAME } from './constants';

export const enum ErrorCode {
  MISSING_APP_CONFIG_VALUES = 'missing-app-config-values',
  CREATE_INSTALLATION_FAILED = 'create-installation-failed',
  GENERATE_TOKEN_FAILED = 'generate-token-failed',
  NOT_REGISTERED = 'not-registered',
  INSTALLATION_NOT_FOUND = 'installation-not-found',
  CREATE_INSTALLATION_REQUEST_FAILED = 'create-installation-request-failed',
  GENERATE_TOKEN_REQUEST_FAILED = 'generate-token-request-failed',
  APP_OFFLINE = 'app-offline'
}

const ERROR_DESCRIPTION_MAP: { readonly [key in ErrorCode]: string } = {
  [ErrorCode.MISSING_APP_CONFIG_VALUES]: 'Missing App configuration values.',
  [ErrorCode.CREATE_INSTALLATION_FAILED]:
    'Could not register Firebase Installation.',
  [ErrorCode.GENERATE_TOKEN_FAILED]: 'Could not generate Auth Token.',
  [ErrorCode.NOT_REGISTERED]: 'Firebase Installation is not registered.',
  [ErrorCode.INSTALLATION_NOT_FOUND]: 'Firebase Installation not found.',
  [ErrorCode.CREATE_INSTALLATION_REQUEST_FAILED]:
    'Create Installation request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
  [ErrorCode.GENERATE_TOKEN_REQUEST_FAILED]:
    'Generate Auth Token request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
  [ErrorCode.APP_OFFLINE]: 'Could not process request. Application offline.'
};

export const ERROR_FACTORY = new ErrorFactory(
  SERVICE,
  SERVICE_NAME,
  ERROR_DESCRIPTION_MAP
);

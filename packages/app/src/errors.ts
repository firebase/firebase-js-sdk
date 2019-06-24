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

import { ErrorFactory, ErrorMap } from '@firebase/util';

export const enum AppError {
  NO_APP = 'no-app',
  BAD_APP_NAME = 'bad-app-name',
  DUPLICATE_APP = 'duplicate-app',
  APP_DELETED = 'app-deleted',
  DUPLICATE_SERVICE = 'duplicate-service',
  INVALID_APP_ARGUMENT = 'invalid-app-argument'
}

const ERRORS: ErrorMap<AppError> = {
  [AppError.NO_APP]:
    "No Firebase App '{$appName}' has been created - " +
    'call Firebase App.initializeApp()',
  [AppError.BAD_APP_NAME]: "Illegal App name: '{$appName}",
  [AppError.DUPLICATE_APP]: "Firebase App named '{$appName}' already exists",
  [AppError.APP_DELETED]: "Firebase App named '{$appName}' already deleted",
  [AppError.DUPLICATE_SERVICE]:
    "Firebase service named '{$appName}' already registered",
  [AppError.INVALID_APP_ARGUMENT]:
    'firebase.{$appName}() takes either no argument or a ' +
    'Firebase App instance.'
};

type ErrorParams = { [key in AppError]: { appName: string } };

export const ERROR_FACTORY = new ErrorFactory<AppError, ErrorParams>(
  'app',
  'Firebase',
  ERRORS
);

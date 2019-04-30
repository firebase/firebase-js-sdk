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

const errors: ErrorMap<AppError> = {
  [AppError.NO_APP]:
    "No Firebase App '{$name}' has been created - " +
    'call Firebase App.initializeApp()',
  [AppError.BAD_APP_NAME]: "Illegal App name: '{$name}",
  [AppError.DUPLICATE_APP]: "Firebase App named '{$name}' already exists",
  [AppError.APP_DELETED]: "Firebase App named '{$name}' already deleted",
  [AppError.DUPLICATE_SERVICE]:
    "Firebase service named '{$name}' already registered",
  [AppError.INVALID_APP_ARGUMENT]:
    'firebase.{$name}() takes either no argument or a ' +
    'Firebase App instance.'
};

const appErrors = new ErrorFactory('app', 'Firebase', errors);

export function error(code: AppError, args?: { [name: string]: any }) {
  throw appErrors.create(code, args);
}

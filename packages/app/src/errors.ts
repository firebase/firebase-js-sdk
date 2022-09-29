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

import { ErrorFactory, ErrorMap } from '@firebase/util';

export const enum AppError {
  NO_APP = 'no-app',
  BAD_APP_NAME = 'bad-app-name',
  DUPLICATE_APP = 'duplicate-app',
  APP_DELETED = 'app-deleted',
  NO_OPTIONS = 'no-options',
  INVALID_APP_ARGUMENT = 'invalid-app-argument',
  INVALID_LOG_ARGUMENT = 'invalid-log-argument',
  IDB_OPEN = 'idb-open',
  IDB_GET = 'idb-get',
  IDB_WRITE = 'idb-set',
  IDB_DELETE = 'idb-delete'
}

const ERRORS: ErrorMap<AppError> = {
  [AppError.NO_APP]:
    "No Firebase App '{$appName}' has been created - " +
    'call Firebase App.initializeApp()',
  [AppError.BAD_APP_NAME]: "Illegal App name: '{$appName}",
  [AppError.DUPLICATE_APP]:
    "Firebase App named '{$appName}' already exists with different options or config",
  [AppError.APP_DELETED]: "Firebase App named '{$appName}' already deleted",
  [AppError.NO_OPTIONS]:
    'Need to provide options, when not being deployed to hosting via source.',
  [AppError.INVALID_APP_ARGUMENT]:
    'firebase.{$appName}() takes either no argument or a ' +
    'Firebase App instance.',
  [AppError.INVALID_LOG_ARGUMENT]:
    'First argument to `onLog` must be null or a function.',
  [AppError.IDB_OPEN]:
    'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
  [AppError.IDB_GET]:
    'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
  [AppError.IDB_WRITE]:
    'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
  [AppError.IDB_DELETE]:
    'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.'
};

interface ErrorParams {
  [AppError.NO_APP]: { appName: string };
  [AppError.BAD_APP_NAME]: { appName: string };
  [AppError.DUPLICATE_APP]: { appName: string };
  [AppError.APP_DELETED]: { appName: string };
  [AppError.INVALID_APP_ARGUMENT]: { appName: string };
  [AppError.IDB_OPEN]: { originalErrorMessage?: string };
  [AppError.IDB_GET]: { originalErrorMessage?: string };
  [AppError.IDB_WRITE]: { originalErrorMessage?: string };
  [AppError.IDB_DELETE]: { originalErrorMessage?: string };
}

export const ERROR_FACTORY = new ErrorFactory<AppError, ErrorParams>(
  'app',
  'Firebase',
  ERRORS
);

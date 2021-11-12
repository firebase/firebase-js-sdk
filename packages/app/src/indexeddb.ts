/**
 * @license
 * Copyright 2021 Google LLC
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

import {
  IndexedDbDatabaseService,
  idbWrite,
  idbRead,
  idbDelete
} from '@firebase/util';
import { AppError, ERROR_FACTORY } from './errors';
import { FirebaseApp } from './public-types';
import { HeartbeatsInIndexedDB } from './types';
const DB_NAME = 'firebase-heartbeat-database';
const DB_VERSION = 1;
const STORE_NAME = 'firebase-heartbeat-store';

const dbService = new IndexedDbDatabaseService(
  DB_NAME,
  STORE_NAME,
  DB_VERSION,
  error => {
    throw ERROR_FACTORY.create(AppError.STORAGE_OPEN, {
      originalErrorMessage: error.message
    });
  }
);

export function readHeartbeatsFromIndexedDB(
  app: FirebaseApp
): Promise<HeartbeatsInIndexedDB | undefined> {
  try {
    return idbRead(dbService, computeKey(app)) as Promise<
      HeartbeatsInIndexedDB | undefined
    >;
  } catch (e) {
    throw ERROR_FACTORY.create(AppError.STORAGE_GET, {
      originalErrorMessage: e.message
    });
  }
}

export function writeHeartbeatsToIndexedDB(
  app: FirebaseApp,
  heartbeatObject: HeartbeatsInIndexedDB
): Promise<void> {
  try {
    return idbWrite(dbService, computeKey(app), heartbeatObject);
  } catch (e) {
    throw ERROR_FACTORY.create(AppError.STORAGE_WRITE, {
      originalErrorMessage: e.message
    });
  }
}

export function deleteHeartbeatsFromIndexedDB(app: FirebaseApp): Promise<void> {
  try {
    return idbDelete(dbService, computeKey(app));
  } catch (e) {
    throw ERROR_FACTORY.create(AppError.STORAGE_DELETE, {
      originalErrorMessage: e.message
    });
  }
}

function computeKey(app: FirebaseApp): string {
  return `${app.name}!${app.options.appId}`;
}

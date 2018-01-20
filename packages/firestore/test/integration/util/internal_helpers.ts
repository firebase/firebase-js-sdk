/**
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

import * as firestore from '@firebase/firestore-types';

import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { Datastore } from '../../../src/remote/datastore';

import { EmptyCredentialsProvider } from '../../../src/api/credentials';
import { PlatformSupport } from '../../../src/platform/platform';
import { AsyncQueue } from '../../../src/util/async_queue';
import { DEFAULT_SETTINGS, DEFAULT_PROJECT_ID } from './helpers';
import { Firestore } from '../../../src/api/database';

/** Drains the AsyncQueue. Delayed tasks are executed immediately. */
export function drainAsyncQueue(
  db: firestore.FirebaseFirestore
): Promise<void> {
  return (db as Firestore)._queue.drain(/* executeDelayedTasks= */ true);
}

export function getDefaultDatabaseInfo(): DatabaseInfo {
  return new DatabaseInfo(
    new DatabaseId(DEFAULT_PROJECT_ID),
    'persistenceKey',
    DEFAULT_SETTINGS.host,
    DEFAULT_SETTINGS.ssl
  );
}

export function withTestDatastore(
  fn: (datastore: Datastore) => Promise<void>,
  queue?: AsyncQueue
): Promise<void> {
  const databaseInfo = getDefaultDatabaseInfo();
  return PlatformSupport.getPlatform()
    .loadConnection(databaseInfo)
    .then(conn => {
      const serializer = PlatformSupport.getPlatform().newSerializer(
        databaseInfo.databaseId
      );
      const datastore = new Datastore(
        databaseInfo,
        queue || new AsyncQueue(),
        conn,
        new EmptyCredentialsProvider(),
        serializer
      );

      return fn(datastore);
    });
}

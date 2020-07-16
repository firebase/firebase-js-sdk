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

import * as firestore from '@firebase/firestore-types';

import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { newDatastore, Datastore } from '../../../src/remote/datastore';

import {
  CredentialChangeListener,
  CredentialsProvider,
  EmptyCredentialsProvider
} from '../../../src/api/credentials';
import { Firestore } from '../../../src/api/database';
import { AsyncQueue } from '../../../src/util/async_queue';
import { withTestDbsSettings } from './helpers';
import { User } from '../../../src/auth/user';
import { DEFAULT_PROJECT_ID, DEFAULT_SETTINGS } from './settings';
import { newConnection } from '../../../src/platform/connection';
import { newSerializer } from '../../../src/platform/serializer';

/** Helper to retrieve the AsyncQueue for a give FirebaseFirestore instance. */
export function asyncQueue(db: firestore.FirebaseFirestore): AsyncQueue {
  return (db as Firestore)._queue;
}

export function getDefaultDatabaseInfo(): DatabaseInfo {
  return new DatabaseInfo(
    new DatabaseId(DEFAULT_PROJECT_ID),
    'persistenceKey',
    DEFAULT_SETTINGS.host!,
    !!DEFAULT_SETTINGS.ssl,
    !!DEFAULT_SETTINGS.experimentalForceLongPolling
  );
}

export function withTestDatastore(
  fn: (datastore: Datastore) => Promise<void>,
  credentialsProvider: CredentialsProvider = new EmptyCredentialsProvider()
): Promise<void> {
  const databaseInfo = getDefaultDatabaseInfo();
  return newConnection(databaseInfo).then(async conn => {
    const serializer = newSerializer(databaseInfo.databaseId);
    const datastore = newDatastore(credentialsProvider, serializer);
    await datastore.start(conn);
    return fn(datastore);
  });
}

export class MockCredentialsProvider extends EmptyCredentialsProvider {
  private listener: CredentialChangeListener | null = null;

  triggerUserChange(newUser: User): void {
    this.listener!(newUser);
  }

  setChangeListener(listener: CredentialChangeListener): void {
    super.setChangeListener(listener);
    this.listener = listener;
  }
}

export function withMockCredentialProviderTestDb(
  persistence: boolean,
  fn: (
    db: firestore.FirebaseFirestore,
    mockCredential: MockCredentialsProvider
  ) => Promise<void>
): Promise<void> {
  const mockCredentialsProvider = new MockCredentialsProvider();
  const settings = {
    ...DEFAULT_SETTINGS,
    credentials: { client: mockCredentialsProvider, type: 'provider' }
  };
  return withTestDbsSettings(
    persistence,
    DEFAULT_PROJECT_ID,
    settings,
    1,
    ([db]) => {
      return fn(db, mockCredentialsProvider);
    }
  );
}

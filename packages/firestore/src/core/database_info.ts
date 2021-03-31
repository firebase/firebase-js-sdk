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

export class DatabaseInfo {
  /**
   * Constructs a DatabaseInfo using the provided host, databaseId and
   * persistenceKey.
   *
   * @param databaseId - The database to use.
   * @param appId - The Firebase App Id.
   * @param persistenceKey - A unique identifier for this Firestore's local
   * storage (used in conjunction with the databaseId).
   * @param host - The Firestore backend host to connect to.
   * @param ssl - Whether to use SSL when connecting.
   * @param forceLongPolling - Whether to use the forceLongPolling option
   * when using WebChannel as the network transport.
   * @param autoDetectLongPolling - Whether to use the detectBufferingProxy
   * option when using WebChannel as the network transport.
   */
  constructor(
    readonly databaseId: DatabaseId,
    readonly appId: string,
    readonly persistenceKey: string,
    readonly host: string,
    readonly ssl: boolean,
    readonly forceLongPolling: boolean,
    readonly autoDetectLongPolling: boolean
  ) {}
}

/** The default database name for a project. */
const DEFAULT_DATABASE_NAME = '(default)';

/** Represents the database ID a Firestore client is associated with. */
export class DatabaseId {
  readonly database: string;
  constructor(readonly projectId: string, database?: string) {
    this.database = database ? database : DEFAULT_DATABASE_NAME;
  }

  get isDefaultDatabase(): boolean {
    return this.database === DEFAULT_DATABASE_NAME;
  }

  isEqual(other: {}): boolean {
    return (
      other instanceof DatabaseId &&
      other.projectId === this.projectId &&
      other.database === this.database
    );
  }
}

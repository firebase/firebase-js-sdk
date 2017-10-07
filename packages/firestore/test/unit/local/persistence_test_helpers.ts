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

import { DatabaseId } from '../../../src/core/database_info';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { MemoryPersistence } from '../../../src/local/memory_persistence';
import { SimpleDb } from '../../../src/local/simple_db';
import { JsonProtoSerializer } from '../../../src/remote/serializer';

/**
 * Creates and starts an IndexedDbPersistence instance for testing, destroying
 * any previous contents if they existed.
 */
export async function testIndexedDbPersistence(): Promise<
  IndexedDbPersistence
> {
  const prefix = 'PersistenceTestHelpers/';
  await SimpleDb.delete(prefix + IndexedDbPersistence.MAIN_DATABASE);
  const partition = new DatabaseId('project');
  const serializer = new JsonProtoSerializer(partition, {
    useProto3Json: true
  });
  const persistence = new IndexedDbPersistence(prefix, serializer);
  await persistence.start();
  return persistence;
}

/** Creates and starts a MemoryPersistence instance for testing. */
export async function testMemoryPersistence(): Promise<MemoryPersistence> {
  const persistence = new MemoryPersistence();
  await persistence.start();
  return persistence;
}

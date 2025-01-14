/**
 * @license
 * Copyright 2024 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  connectDataConnectEmulator,
  DataConnect,
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  QueryRef,
  queryRef,
  QueryResult,
  SerializedRef,
  SOURCE_CACHE,
  SOURCE_SERVER,
  subscribe,
  terminate
} from '../src';

// import { setupQueries } from './emulatorSeeder';
import { getConnectionConfig, initDatabase, PROJECT_ID } from './util';

use(chaiAsPromised);

interface Post {
  id: string;
  description: string;
}
interface PostListResponse {
  posts: Post[];
}

const SEEDED_DATA = [
  {
    id: crypto.randomUUID(),
    description: 'task 1'
  },
  {
    id: crypto.randomUUID(),
    description: 'task 2'
  }
];
const REAL_DATA = SEEDED_DATA.map(obj => ({
  ...obj,
  id: obj.id.replace(/-/g, '')
}));

async function deleteDatabase(instance: DataConnect): Promise<void> {
  for (let i = 0; i < SEEDED_DATA.length; i++) {
    const data = SEEDED_DATA[i];
    const ref = mutationRef(instance, 'RemovePost', { id: data.id });
    await executeMutation(ref);
  }
}
async function seedDatabase(instance: DataConnect): Promise<void> {
  for (let i = 0; i < SEEDED_DATA.length; i++) {
    const data = SEEDED_DATA[i];
    const ref = mutationRef(instance, 'AddPost', data);
    await executeMutation(ref);
  }
}

describe('DataConnect Tests', async () => {
  let dc: DataConnect;
  beforeEach(async () => {
    dc = initDatabase();
    await seedDatabase(dc);
  });
  afterEach(async () => {
    await deleteDatabase(dc);
    await terminate(dc);
  });
  it('Can get all posts', async () => {
    const taskListQuery = queryRef<PostListResponse>(dc, 'ListPosts');
    const taskListRes = await executeQuery(taskListQuery);
    expect(taskListRes.data).to.deep.eq({
      posts: REAL_DATA
    });
  });
  it(`instantly executes a query if one hasn't been subscribed to`, async () => {
    const taskListQuery = queryRef<PostListResponse>(dc, 'ListPosts');
    const promise = new Promise<QueryResult<PostListResponse, undefined>>(
      (resolve, reject) => {
        const unsubscribe = subscribe(taskListQuery, {
          onNext: res => {
            unsubscribe();
            resolve(res);
          },
          onErr: () => {
            unsubscribe();
            reject(res);
          }
        });
      }
    );
    const res = await promise;
    expect(res.data).to.deep.eq({
      posts: REAL_DATA
    });
    expect(res.source).to.eq(SOURCE_SERVER);
  });
  it(`returns the result source as cache when data already exists`, async () => {
    const taskListQuery = queryRef<PostListResponse>(dc, 'ListPosts');
    const queryResult = await executeQuery(taskListQuery);
    const result = await waitForFirstEvent(taskListQuery);
    expect(result.data).to.eq(queryResult.data);
    expect(result.source).to.eq(SOURCE_CACHE);
  });
  it(`returns the proper JSON when calling .toJSON()`, async () => {
    const taskListQuery = queryRef<PostListResponse>(dc, 'ListPosts');
    await executeQuery(taskListQuery);
    const result = await waitForFirstEvent(taskListQuery);
    const serializedRef: SerializedRef<PostListResponse, undefined> = {
      data: {
        posts: REAL_DATA
      },
      fetchTime: Date.now().toLocaleString(),
      refInfo: {
        connectorConfig: {
          ...getConnectionConfig(),
          projectId: PROJECT_ID
        },
        name: taskListQuery.name,
        variables: undefined
      },
      source: SOURCE_CACHE
    };
    const json = result.toJSON();
    expect(json.data).to.deep.eq(serializedRef.data);
    expect(json.refInfo).to.deep.eq(serializedRef.refInfo);
    expect(json.source).to.deep.eq(serializedRef.source);
  });
  it(`throws an error when the user can't connect to the server`, async () => {
    // You can't point an existing data connect instance to a new emulator port, so we have to create a new one
    const fakeInstance = getDataConnect({
      connector: 'wrong',
      location: 'wrong',
      service: 'wrong'
    });
    connectDataConnectEmulator(fakeInstance, 'localhost', 3512);
    const taskListQuery = queryRef<PostListResponse>(fakeInstance, 'ListPosts');
    await expect(executeQuery(taskListQuery)).to.eventually.be.rejectedWith(
      /EADDRNOTAVAIL|ECONNREFUSED|Failed to fetch/
    );
  });
  it('throws an error with just the message when the server responds with an error', async () => {
    const invalidTaskListQuery = queryRef<PostListResponse>(
      dc,
      'UnauthorizedQuery'
    );
    const message =
      'unauthorized: you are not authorized to perform this operation';
    await expect(
      executeQuery(invalidTaskListQuery)
    ).to.eventually.be.rejectedWith(message);
  });
});
async function waitForFirstEvent<Data, Variables>(
  query: QueryRef<Data, Variables>
): Promise<QueryResult<Data, Variables>> {
  return new Promise<{
    result: QueryResult<Data, Variables>;
    unsubscribe: () => void;
  }>((resolve, reject) => {
    const onResult: (result: QueryResult<Data, Variables>) => void = (
      result: QueryResult<Data, Variables>
    ) => {
      setTimeout(() => {
        resolve({
          result,
          unsubscribe
        });
      });
    };
    const unsubscribe = subscribe(query, {
      onNext: onResult,
      onErr: e => {
        reject({ e, unsubscribe });
      }
    });
  }).then(
    ({ result, unsubscribe }) => {
      unsubscribe();
      return result;
    },
    ({ e, unsubscribe }) => {
      unsubscribe();
      throw e;
    }
  );
}

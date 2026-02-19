/**
 * @license
 * Copyright 2025 Google LLC
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

import { initializeApp, FirebaseApp, deleteApp } from '@firebase/app';
import { expect } from 'chai';
import * as sinon from 'sinon';

import {
  DataConnect,
  executeQuery,
  getDataConnect,
  makeMemoryCacheProvider,
  queryRef,
  QueryResult,
  subscribe,
  DataConnectExtension,
  OpResult
} from '../../src';
import { initializeFetch } from '../../src/network/fetch';
import { encoderImpl } from '../../src/util/encoder';

describe('caching', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  beforeEach(() => {
    const { firebaseApp, dc: newDC } = setup();
    dc = newDC;
    app = firebaseApp;
  });
  afterEach(async () => {
    await deleteApp(app);
  });
  it('should resolve from cache with an interdependent query', async () => {
    interface Q1Data {
      movies: Array<{
        title: string;
      }>;
    }
    interface Q2Data {
      movies: Array<{
        title: string;
        genre: string;
      }>;
    }

    const q1MovieData = {
      movies: [
        {
          title: 'matrix'
        }
      ]
    };
    const q2MovieData = {
      movies: [
        {
          title: 'matrix',
          genre: 'sci-fi'
        }
      ]
    };
    const date = new Date().toISOString();
    const q1 = queryRef<Q1Data>(dc, 'q1');
    const matrixEntity = {
      path: ['movies', 0],
      entityId: 'matrix'
    };
    await updateCacheData(
      dc,
      {
        data: q1MovieData,
        fetchTime: date,
        ref: q1,
        source: 'CACHE'
      },
      [matrixEntity]
    );
    const q2 = queryRef<Q2Data>(dc, 'q2');
    await updateCacheData(
      dc,
      {
        data: q2MovieData,
        fetchTime: date,
        ref: q2,
        source: 'CACHE'
      },
      [matrixEntity]
    );

    const events: Array<
      Pick<QueryResult<Q2Data, undefined>, 'data' | 'source'>
    > = [];
    subscribe(q2, event => {
      events.push({
        data: event.data,
        source: event.source
      });
    });

    const expected = {
      data: {
        movies: [
          {
            title: 'the matrix'
          }
        ]
      },
      extensions: {
        dataConnect: [matrixEntity]
      }
    };
    stubFetch(expected);
    const result = await executeQuery(q1, {
      fetchPolicy: 'SERVER_ONLY'
    });
    expect(result.data.movies).to.deep.eq(expected.data.movies);
    // wait for 2 seconds to make sure we don't have too many events coming in.
    await waitFor(2000);

    expect(events.length).to.eq(2);
    expect(events).to.deep.eq([
      {
        data: {
          movies: [
            {
              genre: 'sci-fi',
              title: 'matrix'
            }
          ]
        },
        source: 'CACHE'
      } as QueryResult<Q2Data, undefined>,
      {
        data: {
          movies: [
            {
              genre: 'sci-fi',
              title: 'the matrix'
            }
          ]
        },
        source: 'CACHE'
      } as QueryResult<Q2Data, undefined>
    ]);
    const result2 = await executeQuery(q1, {
      fetchPolicy: 'CACHE_ONLY'
    });
    expect(result2.data.movies).to.deep.eq(expected.data.movies);
    const genreResult = await executeQuery(q2, {
      fetchPolicy: 'CACHE_ONLY'
    });
    expect(genreResult.data.movies).to.deep.eq([
      {
        title: 'the matrix'
      }
    ]);
  });
  it('should not resolve from cache when caching is disabled', async () => {
    const dcWithoutCache = getDataConnect({
      connector: 'a',
      location: 'b',
      service: 'c'
    });
    interface Q1Data {
      movies: Array<{
        title: string;
      }>;
    }
    interface Q2Data {
      movies: Array<{
        title: string;
        genre: string;
      }>;
    }

    const q1MovieData = {
      movies: [
        {
          title: 'matrix'
        }
      ]
    };
    const q2MovieData = {
      movies: [
        {
          title: 'matrix',
          genre: 'sci-fi'
        }
      ]
    };
    const date = new Date().toISOString();
    const q1 = queryRef<Q1Data>(dcWithoutCache, 'q1');
    await updateCacheData(dcWithoutCache, {
      data: q1MovieData,
      fetchTime: date,
      ref: q1,
      source: 'CACHE'
    });
    const q2 = queryRef<Q2Data>(dcWithoutCache, 'q2');
    await updateCacheData(dcWithoutCache, {
      data: q2MovieData,
      fetchTime: date,
      ref: q2,
      source: 'CACHE'
    });

    const events: Array<
      Pick<QueryResult<Q2Data, undefined>, 'data' | 'source'>
    > = [];
    subscribe(q2, event => {
      events.push({
        data: event.data,
        source: event.source
      });
    });

    const expected = {
      data: {
        movies: [
          {
            title: 'matrix'
          }
        ]
      },
      extensions: {
        dataConnect: [
          {
            path: ['movies', 0],
            entityId: 'matrix'
          }
        ]
      }
    };
    stubFetch(expected);
    const result = await executeQuery(q1, {
      fetchPolicy: 'SERVER_ONLY'
    });
    expect(result.data.movies).to.deep.eq(expected.data.movies);
    // wait for 2 seconds to make sure we don't have too many events coming in.
    await waitFor(2000);

    expect(events.length).to.eq(1);
    expect(events).to.deep.eq([
      {
        data: {
          movies: [
            {
              genre: 'sci-fi',
              title: 'matrix'
            }
          ]
        },
        source: 'CACHE'
      } as QueryResult<Q2Data, undefined>
    ]);
  });
  it('retrieve entity data when multiple queries have the same entity id', async () => {
    type Q1Data = {
      movie: {
        title: string;
      };
    };
    const titleResponse: OpResult<Q1Data> = {
      data: {
        movie: {
          title: 'matrix'
        }
      },
      fetchTime: new Date().toISOString(),
      source: 'SERVER',
      extensions: {
        dataConnect: [
          {
            path: ['movie'],
            entityId: 'matrix'
          }
        ]
      }
    };

    type Q2Data = {
      movie: {
        genre: string;
      };
    };
    const genreResponse: OpResult<Q2Data> = {
      data: {
        movie: {
          genre: 'sci-fi'
        }
      },
      fetchTime: new Date().toISOString(),
      source: 'SERVER',
      extensions: {
        dataConnect: [
          {
            path: ['movie'],
            entityId: 'matrix'
          }
        ]
      }
    };

    const titleQueryId = 'titleQuery';
    await updateCacheData(
      dc,
      {
        data: titleResponse.data,
        fetchTime: titleResponse.fetchTime,
        ref: queryRef<Q1Data>(dc, titleQueryId),
        source: titleResponse.source
      },
      titleResponse.extensions?.dataConnect
    );
    const resultTree = await dc._queryManager.getFromResultTreeCache(
      encoderImpl({ name: titleQueryId, refType: 'query' }),
      queryRef<Q1Data>(dc, titleQueryId)
    );
    expect(resultTree?.data).to.deep.eq(titleResponse.data);
    const genreQueryId = 'genreQuery';
    await updateCacheData(
      dc,
      {
        data: genreResponse.data,
        fetchTime: genreResponse.fetchTime,
        ref: queryRef<Q2Data>(dc, genreQueryId),
        source: genreResponse.source
      },
      genreResponse.extensions?.dataConnect
    );
    const resultTree2 = await dc._queryManager.getFromResultTreeCache(
      encoderImpl({ name: genreQueryId, refType: 'query' }),
      queryRef<Q2Data>(dc, genreQueryId)
    );
    expect(resultTree2?.data).to.deep.eq({
      movie: {
        genre: 'sci-fi'
      }
    });
    const result = await executeQuery(queryRef<Q2Data>(dc, genreQueryId), {
      fetchPolicy: 'CACHE_ONLY'
    });
    expect(result.data).to.deep.eq({
      movie: {
        genre: 'sci-fi'
      }
    });
  });
  it('should retrieve a social media homepage with nested comment arrays and overlapping queries', async () => {
    interface Author {
      id: string;
      name: string;
    }
    interface PostComment {
      content: string;
      author: Author;
    }
    interface Post {
      title: string;
      author: Author;
      comments: PostComment[];
    }
    interface HomePageData {
      posts: Post[];
    }
    const homePageData: HomePageData = {
      posts: [
        {
          title: 'post1',
          author: { id: 'author1', name: 'Alice' },
          comments: [
            {
              content: 'comment1',
              author: { id: 'author2', name: 'Bob' }
            },
            {
              content: 'comment2',
              author: { id: 'author1', name: 'Alice' }
            }
          ]
        },
        {
          title: 'post2',
          author: { id: 'author2', name: 'Bob' },
          comments: []
        }
      ]
    };

    const getHomePageQueryId = 'getHomePage';
    await updateCacheData(
      dc,
      {
        data: homePageData,
        fetchTime: new Date().toISOString(),
        ref: queryRef<HomePageData>(dc, getHomePageQueryId),
        source: 'SERVER'
      },
      [
        {
          path: ['posts'],
          entityIds: ['post1', 'post2']
        },
        {
          path: ['posts', 0, 'author'],
          entityId: 'author1'
        },
        {
          path: ['posts', 1, 'author'],
          entityId: 'author2'
        },
        {
          path: ['posts', 0, 'comments'],
          entityIds: ['comment1', 'comment2']
        },
        {
          path: ['posts', 0, 'comments', 0, 'author'],
          entityId: 'author2'
        },
        {
          path: ['posts', 0, 'comments', 1, 'author'],
          entityId: 'author1'
        }
      ]
    );

    const result = await executeQuery(
      queryRef<HomePageData>(dc, getHomePageQueryId),
      {
        fetchPolicy: 'CACHE_ONLY'
      }
    );
    expect(result.data).to.deep.eq(homePageData);

    interface GetUserCommentsData {
      user: {
        id: string;
        name: string;
        comments: PostComment[];
      };
    }
    const userCommentsData: GetUserCommentsData = {
      user: {
        id: 'author1',
        name: 'Alice',
        comments: [
          {
            content: 'comment2',
            author: { id: 'author1', name: 'Alice' }
          }
        ]
      }
    };

    const getUserCommentsQueryId = 'getUserComments';
    await updateCacheData(
      dc,
      {
        data: userCommentsData,
        fetchTime: new Date().toISOString(),
        ref: queryRef<GetUserCommentsData>(dc, getUserCommentsQueryId),
        source: 'SERVER'
      },
      [
        {
          path: ['user'],
          entityId: 'author1'
        },
        {
          path: ['user', 'comments'],
          entityIds: ['comment2']
        },
        {
          path: ['user', 'comments', 0, 'author'],
          entityId: 'author1'
        }
      ]
    );

    const result2 = await executeQuery(
      queryRef<GetUserCommentsData>(dc, getUserCommentsQueryId),
      {
        fetchPolicy: 'CACHE_ONLY'
      }
    );
    expect(result2.data).to.deep.eq(userCommentsData);
  });
});

function stubFetch(response: unknown): void {
  const fakeFetchImpl = sinon.stub().returns({
    json: () => {
      return Promise.resolve(response);
    },
    status: 200
  });
  initializeFetch(fakeFetchImpl);
}

function setup(): { firebaseApp: FirebaseApp; dc: DataConnect } {
  const app = initializeApp({
    projectId: 'p2'
  });
  const connectorConfig = {
    connector: 'c',
    location: 'l',
    service: 's'
  };
  const dc = getDataConnect(connectorConfig, {
    cacheSettings: {
      cacheProvider: makeMemoryCacheProvider()
    }
  });
  return { firebaseApp: app, dc };
}

async function waitFor(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), milliseconds);
  });
}
async function updateCacheData(
  dc: DataConnect,
  {
    data,
    fetchTime,
    ref,
    source
  }: Omit<QueryResult<unknown, unknown>, 'toJSON'>,
  extension?: DataConnectExtension[]
): Promise<string[]> {
  const connectorConfig = dc.getSettings();
  const projectId = dc.app.options.projectId;
  return dc._queryManager.updateCache({
    data,
    fetchTime,
    ref,
    source,
    extensions: {
      dataConnect: extension
    },
    toJSON() {
      return {
        data,
        fetchTime,
        source,
        refInfo: {
          connectorConfig: {
            ...connectorConfig,
            projectId: projectId!
          },
          name: ref.name,
          variables: ref.variables
        }
      };
    }
  });
}

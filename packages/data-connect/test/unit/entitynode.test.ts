/**
 * @license
 * Copyright 2026 Google LLC
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

import { expect } from 'chai';
import { makeMemoryCacheProvider } from '../../src';
import {
  EncodingMode,
  EntityNode,
  GLOBAL_ID_KEY
} from '../../src/cache/EntityNode';
import { ImpactedQueryRefsAccumulator } from '../../src/cache/ImpactedQueryRefsAccumulator';

describe('entity node', () => {
  it('should load data for an array with one entity', async () => {
    const node = new EntityNode();
    /**
     * { movies: [ { title: 'the matrix' } ] }
     * { entityIds: [ { path: ['movies', 0], entityId: 'matrix' } ] }
     */
    const exampleData = {
      movies: [
        {
          title: 'the matrix'
        }
      ]
    };
    const exampleEntityIds = {
      movies: [
        {
          [GLOBAL_ID_KEY]: 'matrix'
        }
      ]
    };
    const cacheId = 'cacheId';
    const memoryCacheProvider = makeMemoryCacheProvider().initialize(cacheId);
    const queryId = 'movies';
    await node.loadData(
      queryId,
      exampleData,
      exampleEntityIds,
      new ImpactedQueryRefsAccumulator(queryId),
      memoryCacheProvider
    );
    expect(node.objectLists).to.have.property('movies');
    expect(node.objectLists.movies[0].entityDataKeys).to.have.lengthOf(1);
    expect(node.objectLists.movies[0].entityDataKeys.has('title')).to.be.true;
    expect(
      node.objectLists.movies[0].toJSON(EncodingMode.hydrated)
    ).to.deep.equal(exampleData.movies[0]);
  });
  it('should load data for an array with multiple entities', async () => {
    /**
     * { movies: [ { title: 'the matrix' }, { title: 'the dark knight' } ] }
     * { entityIds: [ { path: ['movies'], entityIds: ['matrix', 'the dark knight'] } ] }
     */
    const node = new EntityNode();
    const exampleData = {
      movies: [
        {
          title: 'the matrix'
        },
        {
          title: 'the dark knight'
        }
      ]
    };
    const exampleEntityIds = {
      movies: [
        {
          [GLOBAL_ID_KEY]: 'matrix'
        },
        {
          [GLOBAL_ID_KEY]: 'the dark knight'
        }
      ]
    };
    const cacheId = 'cacheId';
    const memoryCacheProvider = makeMemoryCacheProvider().initialize(cacheId);
    const queryId = 'movies';
    await node.loadData(
      queryId,
      exampleData,
      exampleEntityIds,
      new ImpactedQueryRefsAccumulator(queryId),
      memoryCacheProvider
    );
    expect(node.objectLists).to.have.property('movies');
    expect(node.objectLists.movies).to.have.lengthOf(2);
    expect(node.objectLists.movies[0].entityDataKeys.has('title')).to.be.true;
    expect(node.objectLists.movies[1].entityDataKeys.has('title')).to.be.true;
    expect(
      node.objectLists.movies.map(movie => movie.toJSON(EncodingMode.hydrated))
    ).to.deep.equal(exampleData.movies);
  });
  it('should load data for an object', async () => {
    /**
     * { movie: { title: 'the matrix' } }
     * { entityIds: [ { path: ['movies'], entityId: 'matrix' } ] }
     */
    const node = new EntityNode();
    const exampleData = {
      movie: {
        title: 'the matrix'
      }
    };
    const exampleEntityIds = {
      movie: {
        [GLOBAL_ID_KEY]: 'matrix'
      }
    };
    const cacheId = 'cacheId';
    const memoryCacheProvider = makeMemoryCacheProvider().initialize(cacheId);
    const queryId = 'movies';
    await node.loadData(
      queryId,
      exampleData,
      exampleEntityIds,
      new ImpactedQueryRefsAccumulator(queryId),
      memoryCacheProvider
    );
    expect(node.references.movie.entityDataKeys.has('title')).to.be.true;
    expect(node.toJSON(EncodingMode.hydrated)).to.deep.equal(exampleData);
  });
  it('should keep track of the right fields when two queries have different fields required from entity data objects', async () => {
    /**
     * { movies: [ { title: 'the matrix' }, { title: 'the dark knight' } ] }
     * { entityIds: [ { path: ['movies'], entityIds: ['matrix', 'the dark knight'] } ] }
     */

    const cacheId = 'cacheId';
    const memoryCacheProvider = makeMemoryCacheProvider().initialize(cacheId);
    const genreNode = new EntityNode();
    const genreQueryId = 'genre';
    const exampleExtraGenreData = {
      movies: [
        {
          title: 'the matrix',
          genre: 'sci-fi'
        },
        {
          title: 'the dark knight',
          genre: 'action'
        }
      ]
    };
    const exampleExtraGenreEntityIds = {
      movies: [
        {
          [GLOBAL_ID_KEY]: 'matrix'
        },
        {
          [GLOBAL_ID_KEY]: 'the dark knight'
        }
      ]
    };
    await genreNode.loadData(
      genreQueryId,
      exampleExtraGenreData,
      exampleExtraGenreEntityIds,
      new ImpactedQueryRefsAccumulator(genreQueryId),
      memoryCacheProvider
    );
    expect(
      genreNode.objectLists.movies.map(movie =>
        movie.toJSON(EncodingMode.hydrated)
      )
    ).to.deep.equal(exampleExtraGenreData.movies);
    expect(genreNode.objectLists.movies[0].entityDataKeys.has('genre')).to.be
      .true;
    expect(genreNode.objectLists.movies[1].entityDataKeys.has('genre')).to.be
      .true;
    const titleNode = new EntityNode();
    const exampleData = {
      movies: [
        {
          title: 'the matrix'
        },
        {
          title: 'the dark knight'
        }
      ]
    };
    const exampleEntityIds = {
      movies: [
        {
          [GLOBAL_ID_KEY]: 'matrix'
        },
        {
          [GLOBAL_ID_KEY]: 'the dark knight'
        }
      ]
    };
    const queryId = 'movies';
    await titleNode.loadData(
      queryId,
      exampleData,
      exampleEntityIds,
      new ImpactedQueryRefsAccumulator(queryId),
      memoryCacheProvider
    );
    expect(
      titleNode.objectLists.movies.map(movie =>
        movie.toJSON(EncodingMode.hydrated)
      )
    ).to.deep.equal(exampleData.movies);
    expect(titleNode.objectLists.movies[0].entityDataKeys.has('title')).to.be
      .true;
    expect(titleNode.objectLists.movies[1].entityDataKeys.has('title')).to.be
      .true;
    expect(titleNode.objectLists.movies[0].entityDataKeys.has('genre')).to.be
      .false;
    expect(titleNode.objectLists.movies[1].entityDataKeys.has('genre')).to.be
      .false;
    expect(
      titleNode.objectLists.movies[0].entityData?.getServerValues()?.title
    ).to.equal('the matrix');
    expect(
      titleNode.objectLists.movies[1].entityData?.getServerValues()?.title
    ).to.equal('the dark knight');
  });
  it('should load data for nested entities', async () => {
    const exampleEntityIds = {
      posts: [
        {
          author: {
            [GLOBAL_ID_KEY]: 'idForAuthorOfPost1'
          }
        }
      ]
    };
    const exampleData = {
      posts: [
        {
          title: 'Why I love the matrix',
          author: {
            name: 'Cypher'
          }
        }
      ]
    };
    const queryId = 'posts';
    const cacheId = 'cacheId';
    const memoryCacheProvider = makeMemoryCacheProvider().initialize(cacheId);
    const node = new EntityNode();
    await node.loadData(
      queryId,
      exampleData,
      exampleEntityIds,
      new ImpactedQueryRefsAccumulator(queryId),
      memoryCacheProvider
    );
    expect(
      node.objectLists.posts[0].references['author'].entityDataKeys.has('name')
    ).to.be.true;
    expect(
      node.objectLists.posts[0].references[
        'author'
      ].entityData?.getServerValues()!.name
    ).to.equal('Cypher');
  });

  it('should load data for complex nested lists and objects like a social media feed', async () => {
    const exampleEntityIds = {
      posts: [
        {
          [GLOBAL_ID_KEY]: 'post1',
          author: {
            [GLOBAL_ID_KEY]: 'author1'
          },
          comments: [
            {
              [GLOBAL_ID_KEY]: 'comment1',
              author: {
                [GLOBAL_ID_KEY]: 'author2'
              }
            },
            {
              [GLOBAL_ID_KEY]: 'comment2',
              author: {
                [GLOBAL_ID_KEY]: 'author1'
              }
            }
          ]
        },
        {
          [GLOBAL_ID_KEY]: 'post2',
          author: {
            [GLOBAL_ID_KEY]: 'author2'
          },
          comments: []
        }
      ]
    };

    const exampleData = {
      posts: [
        {
          title: 'Hello world',
          author: { name: 'Alice', username: '@alice' },
          comments: [
            {
              content: 'First!',
              author: { name: 'Bob', username: '@bob' }
            },
            {
              content: 'Nice post',
              author: { name: 'Alice', username: '@alice' }
            }
          ]
        },
        {
          title: 'Another day',
          author: { name: 'Bob', username: '@bob' },
          comments: []
        }
      ]
    };

    const queryId = 'homePageQuery';
    const cacheId = 'cacheId';
    const memoryCacheProvider = makeMemoryCacheProvider().initialize(cacheId);
    const node = new EntityNode();

    await node.loadData(
      queryId,
      exampleData,
      exampleEntityIds,
      new ImpactedQueryRefsAccumulator(queryId),
      memoryCacheProvider
    );

    // Verify root-level entities
    expect(node.objectLists).to.have.property('posts');
    expect(node.objectLists.posts).to.have.lengthOf(2);
    expect(node.objectLists.posts[0].entityDataKeys.has('title')).to.be.true;

    // Verify nested entities
    expect(
      node.objectLists.posts[0].references['author'].entityDataKeys.has('name')
    ).to.be.true;
    expect(
      node.objectLists.posts[0].references[
        'author'
      ].entityData?.getServerValues()!.name
    ).to.equal('Alice');

    // Verify deeply nested lists and entities
    expect(node.objectLists.posts[0].objectLists['comments']).to.have.lengthOf(
      2
    );
    expect(
      node.objectLists.posts[0].objectLists['comments'][0].references[
        'author'
      ].entityData?.getServerValues()!.name
    ).to.equal('Bob');
    expect(
      node.objectLists.posts[0].objectLists['comments'][1].references[
        'author'
      ].entityData?.getServerValues()!.name
    ).to.equal('Alice');

    // Verify JSON export constructs the merged object fully
    expect(node.toJSON(EncodingMode.hydrated)).to.deep.equal(exampleData);

    // Make a second query requesting additional fields for the same entity
    const userProfileQueryId = 'userProfileQuery';
    const profileEntityIds = {
      profile: {
        [GLOBAL_ID_KEY]: 'author1'
      }
    };
    const profileData = {
      profile: {
        name: 'Alice',
        bio: 'Just another user',
        avatarUrl: 'https://example.com/alice.png'
      }
    };
    const profileNode = new EntityNode();

    await profileNode.loadData(
      userProfileQueryId,
      profileData,
      profileEntityIds,
      new ImpactedQueryRefsAccumulator(userProfileQueryId),
      memoryCacheProvider
    );

    // The original node's entity should also have received the new fields
    // since both query nodes point to the same global cache manager
    const author1Entity =
      node.objectLists.posts[0].references['author'].entityData;
    expect(author1Entity?.getServerValues()!.name).to.equal('Alice');
    expect(author1Entity?.getServerValues()!.username).to.equal('@alice');
    expect(author1Entity?.getServerValues()!.bio).to.equal('Just another user');
    expect(author1Entity?.getServerValues()!.avatarUrl).to.equal(
      'https://example.com/alice.png'
    );

    // Make sure we kept the original entity keys for this node correct
    expect(
      node.objectLists.posts[0].references['author'].entityDataKeys.has('name')
    ).to.be.true;
    expect(
      node.objectLists.posts[0].references['author'].entityDataKeys.has(
        'username'
      )
    ).to.be.true;
    expect(
      node.objectLists.posts[0].references['author'].entityDataKeys.has('bio')
    ).to.be.false;

    // Verify the profileNode's keys as well
    expect(profileNode.references['profile'].entityDataKeys.has('name')).to.be
      .true;
    expect(profileNode.references['profile'].entityDataKeys.has('bio')).to.be
      .true;
    expect(profileNode.references['profile'].entityDataKeys.has('username')).to
      .be.false;
  });
});

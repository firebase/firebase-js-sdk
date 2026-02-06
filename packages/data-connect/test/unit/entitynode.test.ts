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
});

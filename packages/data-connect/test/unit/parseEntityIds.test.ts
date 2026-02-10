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

/* eslint-disable camelcase */
import { expect } from 'chai';

import { OpResult, SOURCE_SERVER } from '../../src';
import { parseEntityIds } from '../../src/cache/cacheUtils';
describe('parseEntityIds', () => {
  it('should parse single entity id', () => {
    const fetchTime = new Date().toISOString();
    const response: OpResult<unknown> = {
      data: {
        posts: [
          {
            title: 'Post 1',
            author: {
              name: 'Alice'
            },
            comments_on_post: [
              {
                content: 'Great post!'
              },
              {
                content: 'Insightful'
              }
            ]
          },
          {
            title: 'Post 2',
            author: {
              name: 'Bob'
            },
            comments_on_post: [
              {
                content: 'Me too'
              },
              {
                content: 'Congrats!'
              }
            ]
          }
        ]
      },
      fetchTime,
      source: SOURCE_SERVER,
      extensions: {
        dataConnect: [
          {
            path: ['posts'],
            entityIds: ['idForPost1GoesHere', 'idForPost2GoesHere']
          },
          {
            path: ['posts', 0, 'author'],
            entityId: 'idForAuthorOfPost1'
          },
          {
            path: ['posts', 1, 'author'],
            entityId: 'idForAuthorOfPost2'
          },
          {
            path: ['posts', 0, 'comments_on_post'],
            entityIds: ['idForPost1Comment1', 'idForPost1Comment2']
          },
          {
            path: ['posts', 1, 'comments_on_post'],
            entityIds: ['idForPost2Comment1', 'idForPost2Comment2']
          }
        ]
      }
    };
    const actual = parseEntityIds(response);
    // @ts-ignore
    expect(actual.posts[0].author._id).to.eq('idForAuthorOfPost1');
    // @ts-ignore
    expect(actual.posts[1].author._id).to.eq('idForAuthorOfPost2');
    // @ts-ignore
    expect(actual.posts[0]._id).to.eq('idForPost1GoesHere');
    // @ts-ignore
    expect(actual.posts[1]._id).to.eq('idForPost2GoesHere');
    // @ts-ignore
    expect(actual.posts[0].comments_on_post[0]._id).to.eq('idForPost1Comment1');
    // @ts-ignore
    expect(actual.posts[0].comments_on_post[1]._id).to.eq('idForPost1Comment2');
    // @ts-ignore
    expect(actual.posts[1].comments_on_post[0]._id).to.eq('idForPost2Comment1');
    // @ts-ignore
    expect(actual.posts[1].comments_on_post[1]._id).to.eq('idForPost2Comment2');
  });
});

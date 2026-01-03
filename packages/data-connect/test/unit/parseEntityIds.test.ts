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

import { parseEntityIds } from '../../src/core/query/QueryManager';
describe('parseEntityIds', () => {
  it('should parse single entity id', () => {
    const response = {
      // Same as before except no more _id
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
      errors: [],
      // New! SDKs should parse this. Only present when Connector.clientCache.includeEntityId is true (can be set via the control plane soon; CLI will set it according to YAML later)
      extensions: {
        // Unique top-level key to avoid (future) conflicts with other GQL extensions
        // Not called "cache" since it can be used for realtime and pagination too later
        dataConnect: [
          // This is a list, each item contains a path and properties for that path.
          {
            // If path points to a list, then there will be multiple IDs, one for
            // each element, in list order.
            path: ['posts'],
            entityIds: ['idForPost1GoesHere', 'idForPost2GoesHere']
            // Later we can attach properties like pagination to the same list here.
          },
          {
            // If path points to a single object, there is only one entityId.
            path: ['posts', 0, 'author'], // Each path segment may be string (field name) or number (index).
            entityId: 'idForAuthorOfPost1' // singular entityId, not entityIds
            // Later we can attach object-level properties here.
          },
          {
            // There's some path repetition for nested objects but it will not be so
            // bad after response gzipping (for proto and JSON alike).
            path: ['posts', 1, 'author'], // Each path segment may be string (field name) or number (index).
            entityId: 'idForAuthorOfPost2'
          },
          // The backend will prefer to return paths pointing to lists when possible.
          {
            path: ['posts', 0, 'comments_on_post'],
            entityIds: ['idForPost1Comment1', 'idForPost1Comment2']
          },
          {
            path: ['posts', 1, 'comments_on_post'],
            entityIds: ['idForPost2Comment1', 'idForPost2Comment2']
          }
          // Although these are valid under our spec, the backend in practice
          // will choose the wire-efficient equivalent above.
          /*
      {
        path: ["posts", 1, "comments_on_post", 0],
        entityId: "idForPost2Comment1"
      },
      {
        path: ["posts", 1, "comments_on_post", 1],
        entityId: "idForPost2Comment2"
      }, /* and so on */
          // Later if we need to do a response-level property, we still can:
          // {path: [/*empty*/], propertyForTheWholeResponse: ...}
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
    expect(actual.posts[0].comments_on_post[0]._id).to.eq(
      'idForPost1Comment1'
    );
    // @ts-ignore
    expect(actual.posts[0].comments_on_post[1]._id).to.eq(
      'idForPost1Comment2'
    );
    // @ts-ignore
    expect(actual.posts[1].comments_on_post[0]._id).to.eq(
      'idForPost2Comment1'
    );
    // @ts-ignore
    expect(actual.posts[1].comments_on_post[1]._id).to.eq(
      'idForPost2Comment2'
    );
  });
});

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

import {
  ConnectorConfig,
  DataConnect,
  QueryRef,
  QueryPromise,
  MutationRef,
  MutationPromise
} from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;

export interface AddPostData {
  post_insert: Post_Key;
}

export interface AddPostVariables {
  id: UUIDString;
  description: string;
  testId: string;
}

export interface ListPostsData {
  posts: ({
    id: UUIDString;
    description: string;
  } & Post_Key)[];
}

export interface ListPostsVariables {
  testId: string;
}

export interface Post_Key {
  id: UUIDString;
  __typename?: 'Post_Key';
}

export interface RemovePostData {
  post_delete?: Post_Key | null;
}

export interface RemovePostVariables {
  id: UUIDString;
}

export interface UnauthorizedQueryData {
  posts: ({
    id: UUIDString;
    description: string;
  } & Post_Key)[];
}

/* Allow users to create refs without passing in DataConnect */
export function removePostRef(
  vars: RemovePostVariables
): MutationRef<RemovePostData, RemovePostVariables>;
/* Allow users to pass in custom DataConnect instances */
export function removePostRef(
  dc: DataConnec,
  vars: RemovePostVariables
): MutationRef<RemovePostData, RemovePostVariables>;

export function removePost(
  vars: RemovePostVariables
): MutationPromise<RemovePostData, RemovePostVariables>;
export function removePost(
  dc: DataConnect,
  vars: RemovePostVariables
): MutationPromise<RemovePostData, RemovePostVariables>;

/* Allow users to create refs without passing in DataConnect */
export function addPostRef(
  vars: AddPostVariables
): MutationRef<AddPostData, AddPostVariables>;
/* Allow users to pass in custom DataConnect instances */
export function addPostRef(
  dc: DataConnec,
  vars: AddPostVariables
): MutationRef<AddPostData, AddPostVariables>;

export function addPost(
  vars: AddPostVariables
): MutationPromise<AddPostData, AddPostVariables>;
export function addPost(
  dc: DataConnect,
  vars: AddPostVariables
): MutationPromise<AddPostData, AddPostVariables>;

/* Allow users to create refs without passing in DataConnect */
export function listPostsRef(
  vars: ListPostsVariables
): QueryRef<ListPostsData, ListPostsVariables>;
/* Allow users to pass in custom DataConnect instances */
export function listPostsRef(
  dc: DataConnec,
  vars: ListPostsVariables
): QueryRef<ListPostsData, ListPostsVariables>;

export function listPosts(
  vars: ListPostsVariables
): QueryPromise<ListPostsData, ListPostsVariables>;
export function listPosts(
  dc: DataConnect,
  vars: ListPostsVariables
): QueryPromise<ListPostsData, ListPostsVariables>;

/* Allow users to create refs without passing in DataConnect */
export function unauthorizedQueryRef(): QueryRef<
  UnauthorizedQueryData,
  undefined
>;
/* Allow users to pass in custom DataConnect instances */
export function unauthorizedQueryRef(
  dc: DataConnect
): QueryRef<UnauthorizedQueryData, undefined>;

export function unauthorizedQuery(): QueryPromise<
  UnauthorizedQueryData,
  undefined
>;
export function unauthorizedQuery(
  dc: DataConnect
): QueryPromise<UnauthorizedQueryData, undefined>;

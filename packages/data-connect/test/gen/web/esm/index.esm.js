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
  queryRef,
  executeQuery,
  mutationRef,
  executeMutation,
  validateArgs
} from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'tests',
  service: 'fdc-service',
  location: 'us-west2'
};

export function removePostRef(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RemovePost', inputVars);
}

export function removePost(dcOrVars, vars) {
  return executeMutation(removePostRef(dcOrVars, vars));
}

export function addPostRef(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddPost', inputVars);
}

export function addPost(dcOrVars, vars) {
  return executeMutation(addPostRef(dcOrVars, vars));
}

export function listPostsRef(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true
  );
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPosts', inputVars);
}

export function listPosts(dcOrVars, vars) {
  return executeQuery(listPostsRef(dcOrVars, vars));
}

export function unauthorizedQueryRef(dc) {
  const { dc: dcInstance } = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'UnauthorizedQuery');
}

export function unauthorizedQuery(dc) {
  return executeQuery(unauthorizedQueryRef(dc));
}

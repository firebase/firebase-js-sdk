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
  connector: 'default',
  service: 'fdc-test',
  location: 'us-central1'
};

export function createMovieRef(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMovie', inputVars);
}

export function createMovie(dcOrVars, vars) {
  return executeMutation(createMovieRef(dcOrVars, vars));
}

export function listMoviesRef(dc) {
  const { dc: dcInstance } = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMovies');
}

export function listMovies(dc) {
  return executeQuery(listMoviesRef(dc));
}

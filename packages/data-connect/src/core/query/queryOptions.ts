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

export const QueryFetchPolicy = {
  PREFER_CACHE: 'PREFER_CACHE',
  CACHE_ONLY: 'CACHE_ONLY',
  SERVER_ONLY: 'SERVER_ONLY'
} as const;

/*
 * Represents policy for how executeQuery fetches data
 *
 */
export type QueryFetchPolicy = (typeof QueryFetchPolicy)[keyof typeof QueryFetchPolicy];

export interface ExecuteQueryOptions {
  fetchPolicy: QueryFetchPolicy;
}

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

export interface CreateMovieData {
  movie_insert: Movie_Key;
}

export interface CreateMovieVariables {
  title: string;
  genre: string;
  imageUrl: string;
}

export interface ListMoviesData {
  movies: ({
    id: UUIDString;
    title: string;
    imageUrl: string;
    genre?: string | null;
  } & Movie_Key)[];
}

export interface Movie_Key {
  id: UUIDString;
  __typename?: 'Movie_Key';
}

/* Allow users to create refs without passing in DataConnect */
export function createMovieRef(
  vars: CreateMovieVariables
): MutationRef<CreateMovieData, CreateMovieVariables>;
/* Allow users to pass in custom DataConnect instances */
export function createMovieRef(
  dc: DataConnect,
  vars: CreateMovieVariables
): MutationRef<CreateMovieData, CreateMovieVariables>;

export function createMovie(
  vars: CreateMovieVariables
): MutationPromise<CreateMovieData, CreateMovieVariables>;
export function createMovie(
  dc: DataConnect,
  vars: CreateMovieVariables
): MutationPromise<CreateMovieData, CreateMovieVariables>;

/* Allow users to create refs without passing in DataConnect */
export function listMoviesRef(): QueryRef<ListMoviesData, undefined>;
/* Allow users to pass in custom DataConnect instances */
export function listMoviesRef(
  dc: DataConnect
): QueryRef<ListMoviesData, undefined>;

export function listMovies(): QueryPromise<ListMoviesData, undefined>;
export function listMovies(
  dc: DataConnect
): QueryPromise<ListMoviesData, undefined>;

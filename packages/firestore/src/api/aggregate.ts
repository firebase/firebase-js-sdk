/**
 * @license
 * Copyright 2022 Google LLC
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
  AggregateField,
  AggregateQuery,
  AggregateQuerySnapshot as LiteAggregateQuerySnapshot,
  GroupByQuery,
  GroupByQuerySnapshot as LiteGroupByQuerySnapshot,
  GroupSnapshot as LiteGroupSnapshot
} from '../lite-api/aggregate';
import {DocumentData, DocumentFieldValue, Query} from './reference';
import {SnapshotListenOptions, Unsubscribe} from './reference_impl';
import {QuerySnapshot} from './snapshot';
import { FirestoreError } from '../util/error';

export class AggregateQuerySnapshot extends LiteAggregateQuerySnapshot {

}

export function getAggregate(query: AggregateQuery): Promise<AggregateQuerySnapshot>;
export function getAggregateFromCache(query: AggregateQuery): Promise<AggregateQuerySnapshot>;
export function getAggregateFromServer(query: AggregateQuery): Promise<AggregateQuerySnapshot>;

export function onAggregateSnapshot<T>(
  query: AggregateQuery,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: AggregateQuery,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: AggregateQuery,
  onNext: (snapshot: AggregateQuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: AggregateQuery,
  options: SnapshotListenOptions,
  onNext: (snapshot: AggregateQuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: Query<T>,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  observer: {
    next?: (snapshot: QuerySnapshot<T>) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: Query<T>,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onAggregateSnapshot<T>(
  query: Query<T>,
  options: SnapshotListenOptions,
  onNext: (snapshot: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

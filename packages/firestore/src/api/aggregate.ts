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
  AggregateField, aggregateQuery,
  AggregateQuery,
  AggregateQuerySnapshot as LiteAggregateQuerySnapshot, count,
  GroupByQuery,
  GroupByQueryConstraintType,
  GroupByQuerySnapshot as LiteGroupByQuerySnapshot,
  GroupSnapshot as LiteGroupSnapshot
} from '../lite-api/aggregate';
import { SnapshotListenOptions, Unsubscribe } from './reference_impl';
import { SnapshotMetadata, SnapshotOptions } from './snapshot';
import { FirestoreError } from '../util/error';
import { FieldPath } from '../lite-api/field_path';

export {
  AggregateField,
  AggregateQuery,
  CountAggregateFieldOptions,
  aggregateQuery,
  aggregateQueryEqual,
  aggregateSnapshotEqual,
  average,
  count,
  countQuery,
  first,
  last,
  max,
  min,
  sum,
} from '../lite-api/aggregate';


export abstract class GroupByQueryConstraint {
  abstract readonly type: GroupByQueryConstraintType;
}

export interface AggregateQueryOptions {
  // TODO: "mode" -> "aggregateExecutionMode" for clarity at the call site?
  readonly mode?: 'full' | 'lite';
}

export class AggregateQuerySnapshot extends LiteAggregateQuerySnapshot {
  readonly metadata: SnapshotMetadata;

  get<T>(field: AggregateField<T>, options: SnapshotOptions = {}): T;
}

export function getAggregate(query: AggregateQuery, options: AggregateQueryOptions = {}): Promise<AggregateQuerySnapshot>;
export function getAggregateFromCache(query: AggregateQuery, options: AggregateQueryOptions = {}): Promise<AggregateQuerySnapshot>;
export function getAggregateFromServer(query: AggregateQuery, options: AggregateQueryOptions = {}): Promise<AggregateQuerySnapshot>;

export interface AggregateListenOptions extends AggregateQueryOptions, SnapshotListenOptions {
}

export function onAggregateSnapshot(
  query: AggregateQuery,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

export function onAggregateSnapshot(
  query: AggregateQuery,
  options: AggregateListenOptions,
  observer: {
    next?: (snapshot: AggregateQuerySnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

export function onAggregateSnapshot(
  query: AggregateQuery,
  onNext: (snapshot: AggregateQuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export function onAggregateSnapshot(
  query: AggregateQuery,
  options: AggregateListenOptions,
  onNext: (snapshot: AggregateQuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export type GroupChangeType = 'added' | 'removed' | 'modified';

export interface GroupChange {
  readonly type: GroupChangeType;

  readonly group: GroupSnapshot;

  readonly oldIndex: number;

  readonly newIndex: number;
}

export class GroupByQuerySnapshot extends LiteGroupByQuerySnapshot {
  readonly metadata: SnapshotMetadata;

  groupChanges(options: SnapshotListenOptions = {}): Array<GroupChange>;
}

export class GroupSnapshot extends LiteGroupSnapshot {

  get(field: string | FieldPath, options: SnapshotOptions = {}): any;
  get<T>(field: AggregateField<T>, options: SnapshotOptions = {}): T;

}

export function getGroups(query: GroupByQuery, options: AggregateQueryOptions = {}): Promise<GroupByQuerySnapshot>;
export function getGroupsFromCache(query: GroupByQuery, options: AggregateQueryOptions = {}): Promise<GroupByQuerySnapshot>;
export function getGroupsFromServer(query: GroupByQuery, options: AggregateQueryOptions = {}): Promise<GroupByQuerySnapshot>;

export function onGroupBySnapshot(
  query: GroupByQuery,
  observer: {
    next?: (snapshot: GroupByQuerySnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

export function onGroupBySnapshot(
  query: GroupByQuery,
  options: AggregateListenOptions,
  observer: {
    next?: (snapshot: GroupByQuerySnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;

export function onGroupBySnapshot(
  query: GroupByQuery,
  onNext: (snapshot: GroupByQuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

export function onGroupBySnapshot(
  query: GroupByQuery,
  options: AggregateListenOptions,
  onNext: (snapshot: GroupByQuerySnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;

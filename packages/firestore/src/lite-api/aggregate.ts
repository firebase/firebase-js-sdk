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

import {DocumentData, DocumentFieldValue, Query} from './reference';
import {FieldPath} from './field_path';
import {OrderByDirection} from './query';

export class AggregateField<T = DocumentFieldValue> {
  private constructor();

  isEqual(other: AggregateField): boolean;
}

export interface CountAggregateFieldOptions {
  readonly upTo?: number;
}

export function count(options?: CountAggregateFieldOptions): AggregateField<number>;
export function min(field: string | FieldPath): AggregateField<any>;
export function max(field: string | FieldPath): AggregateField<any>;
export function average(field: string | FieldPath): AggregateField<number>;
export function sum(field: string | FieldPath): AggregateField<number>;
export function first(field: string | FieldPath): AggregateField<any>;
export function last(field: string | FieldPath): AggregateField<any>;

export class AggregateQuery {
  private constructor();

  readonly type = "aggregate_query";

  readonly query: Query<DocumentData>;
}

export function aggregateQuery(query: Query<DocumentData>, field: AggregateField, ...fields: AggregateField[]): AggregateQuery;

export function aggregateQueryEqual(left: AggregateQuery, right: AggregateQuery): boolean;

export function getAggregate(query: AggregateQuery): Promise<AggregateQuerySnapshot>;

export class AggregateQuerySnapshot {
  private constructor();

  readonly type = "aggregate_query_snapshot";

  readonly query: AggregateQuery;

  get aggregations(): Array<AggregateField>;

  get<T>(field: AggregateField<T>): T;
}

export function aggregateSnapshotEqual<T>(left: AggregateQuerySnapshot, right: AggregateQuerySnapshot): boolean;

export class GroupByQuery {
  private constructor();

  readonly type = "group_by_query";

  readonly query: Query<DocumentData>;
}

export function groupByQuery(
  query: Query<DocumentData>,
  field: string | FieldPath,
  ...rest: (string | FieldPath | AggregateField | GroupByQueryConstraint)[]
): GroupByQuery;

export function groupByQuery(query: GroupByQuery, ...constraints: GroupByQueryConstraint[]): GroupByQuery;

export function groupByQueryEqual(left: GroupByQuery, right: GroupByQuery): boolean;

export type GroupByQueryConstraintType =
  | 'orderByGroup'
  | 'groupLimit'
  | 'groupLimitToLast'
  | 'startAtGroup'
  | 'startAfterGroup'
  | 'endAtGroup'
  | 'endBeforeGroup';

export abstract class GroupByQueryConstraint {
  abstract readonly type: GroupByQueryConstraintType;
}

export function orderByGroup(
  field: string | FieldPath | AggregateField,
  directionStr: OrderByDirection = 'asc'
): GroupByQueryConstraint;

export function limitGroups(limit: number): GroupByQueryConstraint;
export function limitToLastGroups(limit: number): GroupByQueryConstraint;

export function startAtGroup(snapshot: GroupSnapshot): GroupByQueryConstraint;
export function startAtGroup(...fieldValues: unknown[]): GroupByQueryConstraint;
export function startAfterGroup(snapshot: GroupSnapshot): GroupByQueryConstraint;
export function startAfterGroup(...fieldValues: unknown[]): GroupByQueryConstraint;
export function endAtGroup(snapshot: GroupSnapshot): GroupByQueryConstraint;
export function endAtGroup(...fieldValues: unknown[]): GroupByQueryConstraint;
export function endBeforeGroup(snapshot: GroupSnapshot): GroupByQueryConstraint;
export function endBeforeGroup(...fieldValues: unknown[]): GroupByQueryConstraint;

// TODO(dconeybe) Do we want to expose "group offset" in the client SDKs?
// The normal document queries do NOT expose "offset".
export function groupOffset(offset: number): GroupByQueryConstraint;

export function getGroups(query: GroupByQuery): Promise<GroupByQuerySnapshot>;

export class GroupByQuerySnapshot {
  private constructor();

  readonly type = "group_by_query_snapshot";

  readonly query: GroupByQuery;

  get groups(): Array<GroupSnapshot>;

  get size(): number;

  get empty(): boolean;

  forEach(
    callback: (result: GroupSnapshot) => void,
    thisArg?: unknown
  ): void;
}

export function groupByQuerySnapshotEqual(left: GroupByQuerySnapshot, right: GroupByQuerySnapshot): boolean;

export class GroupSnapshot {
  private constructor();

  readonly type = "group_snapshot";

  get aggregations(): Array<AggregateField>;

  get fields(): Array<FieldPath>;

  get(field: string | FieldPath): any;
  get<T>(field: AggregateField<T>): T;

}

export function groupSnapshotEqual(left: GroupSnapshot, right: GroupSnapshot): boolean;




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

import {DocumentData, Query} from './reference';
import {FieldPath} from './field_path';

export class AggregateField {
  private constructor();

  isEqual(other: AggregateField): boolean;
}

export interface CountAggregateFieldOptions {
  readonly upTo?: number;
}

export function count(options?: CountAggregateFieldOptions): AggregateField;
export function min(field: string | FieldPath): AggregateField;
export function max(field: string | FieldPath): AggregateField;
export function average(field: string | FieldPath): AggregateField;
export function sum(field: string | FieldPath): AggregateField;
export function first(field: string | FieldPath): AggregateField;
export function last(field: string | FieldPath): AggregateField;

export class AggregateQuery {
  private constructor();

  readonly query: Query<DocumentData>;
}

export function aggregate(query: Query<DocumentData>, field: AggregateField, ...fields: AggregateField[]): AggregateQuery;

export function aggregateQueryEqual(left: AggregateQuery, right: AggregateQuery): boolean;

export function getAggregate(query: AggregateQuery): Promise<AggregateSnapshot>;

export class AggregateSnapshot {
  private constructor();

  readonly query: AggregateQuery;

  readonly aggregations: Array<AggregateField>;

  get(field: AggregateField): any;
}

export function aggregateSnapshotEqual<T>(left: AggregateSnapshot, right: AggregateSnapshot): boolean;

export class GroupByQuery {
  private constructor();

  readonly query: Query<DocumentData>;
}

export function groupBy(query: Query<DocumentData>, field: string | FieldPath, ...fields: (string | FieldPath)[]): GroupByQuery;

export function groupByQueryEqual(left: GroupByQuery, right: GroupByQuery): boolean;

export function aggregateGroup(query: GroupByQuery, ...fields: AggregateField[]): GroupByQuery;

export function getGroups(query: GroupByQuery): Promise<GroupByAggregateSnapshot>;

export class GroupByAggregateSnapshot {
  private constructor();

  readonly query: GroupByQuery;

  readonly groups: Array<GroupSnapshot>;

  readonly size: number;

  readonly empty: boolean;

  forEach(
    callback: (result: GroupSnapshot) => void,
    thisArg?: unknown
  ): void;
}

export function groupByAggregateSnapshotEqual(left: GroupByAggregateSnapshot, right: GroupByAggregateSnapshot): boolean;

export class GroupSnapshot {
  private constructor();

  readonly query: AggregateQuery;

  readonly aggregations: Array<AggregateField>;

  readonly fields: Array<FieldPath>;

  get(field: string | FieldPath | AggregateField): any;
}

export function groupSnapshotEqual(left: GroupSnapshot, right: GroupSnapshot): boolean;




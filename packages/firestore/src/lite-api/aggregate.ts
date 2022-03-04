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
import {DocumentSnapshot, QuerySnapshot} from './snapshot';

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

export class AggregateSnapshot {
  private constructor();

  readonly query: AggregateQuery;

  readonly aggregations: Array<AggregateField>;

  get(field: AggregateField): any;
}

export function aggregateSnapshotEqual<T>(left: AggregateSnapshot, right: AggregateSnapshot): boolean;

export class AggregateQuery {
  private constructor();

  readonly query: Query<DocumentData>;
}

export function aggregate(query: Query<DocumentData>, field: AggregateField, ...fields: AggregateField[]): AggregateQuery;

export function aggregateQueryEqual(left: AggregateQuery, right: AggregateQuery): boolean;

export function getAggregate(query: AggregateQuery): Promise<AggregateSnapshot>;

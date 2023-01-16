/**
 * @license
 * Copyright 2023 Google LLC
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

import { FieldPath } from '../model/path';

type AggregateType = 'count' | 'avg' | 'sum';

/**
 * TODO
 */
export interface Aggregate {
  readonly fieldPath?: FieldPath;
  readonly alias: string;
  readonly aggregateType: AggregateType;
}

/**
 * TODO
 */
export class AggregateImpl implements Aggregate {
  constructor(
    readonly alias: string,
    readonly aggregateType: AggregateType,
    readonly fieldPath?: FieldPath
  ) {}
}

/**
 * TODO
 * @param alias
 * @param aggregateType
 * @param fieldPath
 */
export function newAggregate(
  alias: string,
  aggregateType: AggregateType,
  fieldPath?: FieldPath
): Aggregate {
  return new AggregateImpl(alias, aggregateType, fieldPath);
}

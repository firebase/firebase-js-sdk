/**
 * @license
 * Copyright 2024 Google LLC
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
  MapValue as ProtoMapValue,
  Value as ProtoValue
} from '../protos/firestore_proto_api';

import { valueEquals } from './values';

/**
 * An AggregateResultValue represents a MapValue in the Firestore Proto.
 */
export class AggregateResultValue {
  constructor(readonly value: { mapValue: ProtoMapValue }) {}

  static empty(): AggregateResultValue {
    return new AggregateResultValue({ mapValue: {} });
  }

  aggregate(alias: string): ProtoValue | null {
    return this.value.mapValue.fields?.[alias] ?? null;
  }

  isEqual(other: AggregateResultValue): boolean {
    return valueEquals(this.value, other.value);
  }
}

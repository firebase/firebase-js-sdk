import { DocumentKey } from './document_key';
import { ObjectValue } from './object_value';
import { FieldTransform, Mutation, Precondition } from './mutation';
import { ResourcePath } from './path';

/**
 * @license
 * Copyright 2020 Google LLC
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

export class Overlay {
  constructor(readonly largestBatchId: number, readonly mutation: Mutation) {}

  getKey(): DocumentKey {
    return this.mutation.key;
  }

  isEqual(other: Overlay | null): boolean {
    return other !== null && this.mutation === other.mutation;
  }

  toString(): string {
    return `Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`;
  }
}

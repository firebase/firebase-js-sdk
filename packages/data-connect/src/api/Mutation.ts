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

import { DataConnectTransport } from '../network/transport';

import { DataConnect } from './DataConnect';
import {
  DataConnectResult,
  MUTATION_STR,
  OperationRef,
  SOURCE_SERVER
} from './Reference';

export interface MutationRef<Data, Variables>
  extends OperationRef<Data, Variables> {
  refType: typeof MUTATION_STR;
}

export function mutationRef<Data>(
  dcInstance: DataConnect,
  queryName: string
): MutationRef<Data, undefined>;
export function mutationRef<Data, Variables>(
  dcInstance: DataConnect,
  mutationName: string,
  variables: Variables
): MutationRef<Data, Variables>;
export function mutationRef<Data, Variables>(
  dcInstance: DataConnect,
  queryName: string,
  variables?: Variables
): MutationRef<Data, Variables> {
  dcInstance.setInitialized();
  const ref: MutationRef<Data, Variables> = {
    dataConnect: dcInstance,
    name: queryName,
    refType: MUTATION_STR,
    variables: variables as Variables
  };
  return ref;
}

export class MutationManager {
  private _inflight: Array<PromiseLike<unknown>> = [];
  constructor(private _transport: DataConnectTransport) {}
  executeMutation<Data, Variables>(
    mutationRef: MutationRef<Data, Variables>
  ): MutationPromise<Data, Variables> {
    const result = this._transport.invokeMutation<Data, Variables>(
      mutationRef.name,
      mutationRef.variables
    );
    const withRefPromise = result.then(res => {
      const obj: MutationResult<Data, Variables> = {
        ...res, // Double check that the result is result.data, not just result
        source: SOURCE_SERVER,
        ref: mutationRef,
        fetchTime: Date.now().toLocaleString()
      };
      return obj;
    });
    this._inflight.push(result);
    const removePromise = () =>
      (this._inflight = this._inflight.filter(promise => promise !== result));
    result.then(removePromise, removePromise);
    return withRefPromise;
  }
}

export interface MutationResult<Data, Variables>
  extends DataConnectResult<Data, Variables> {
  ref: MutationRef<Data, Variables>;
}
export interface MutationPromise<Data, Variables>
  extends PromiseLike<MutationResult<Data, Variables>> {
  // reserved for special actions like cancellation
}

export function executeMutation<Data, Variables>(
  mutationRef: MutationRef<Data, Variables>
): MutationPromise<Data, Variables> {
  return mutationRef.dataConnect._mutationManager.executeMutation(mutationRef);
}

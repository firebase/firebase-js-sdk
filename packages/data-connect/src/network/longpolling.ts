/**
 * @license
 * Copyright 2026 Google LLC
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

import { OperationRef, QueryRef } from '../api';

import {
  ExecutionStream,
  SubscriptionStream,
  LogicalStream,
  DataConnectResponse,
  DataConnectStreamManager
} from './transport';

export class LongPollingStreamManager implements DataConnectStreamManager {
  executions: Array<ExecutionStream<object, object | undefined>> = []; // TODO: consider how to type this array... or do something different...
  subscriptions: Array<SubscriptionStream<object, object | undefined>> = []; // TODO: consider how to type this array... or do something different...

  openConnection(): void {
    throw new Error('Method not implemented.');
  }

  closeConnection(): void {
    throw new Error('Method not implemented.');
  }

  reconnect(): void {
    throw new Error('Method not implemented.');
  }

  sendMessage<Data, Variables>(
    stream: LogicalStream<Data, Variables>,
    message: object
  ): void {
    throw new Error('Method not implemented.');
  }

  executeOperation<Data, Variables>(
    operationRef: OperationRef<Data, Variables>
  ): Promise<DataConnectResponse<Data>> {
    throw new Error('Method not implemented.');
  }

  subscribeQuery<Data, Variables>(queryRef: QueryRef<Data, Variables>): void {
    throw new Error('Method not implemented.');
  }

  unsubscribeQuery(): void {
    throw new Error('Method not implemented.');
  }

  heartbeat(): void {
    throw new Error('Method not implemented.');
  }

  openExecutionStream<Data, Variables>(): ExecutionStream<Data, Variables> {
    throw new Error('Method not implemented.');
  }

  handleExecutionResponse<Data>(): DataConnectResponse<Data> {
    throw new Error('Method not implemented.');
  }

  openSubscriptionStream<Data, Variables>(): SubscriptionStream<
    Data,
    Variables
  > {
    throw new Error('Method not implemented.');
  }

  handleSubscriptionNotification(): void {
    throw new Error('Method not implemented.');
  }
}

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
import { Connection } from '../implementation/connection';
import {
  newTextConnection as nodeNewTextConnection,
  newBytesConnection as nodeNewBytesConnection,
  newBlobConnection as nodeNewBlobConnection,
  newStreamConnection as nodeNewStreamConnection,
  injectTestConnection as nodeInjectTestConnection
} from './node/connection';
import { ReadableStream } from 'stream/web';

export function injectTestConnection(
  factory: (() => Connection<string>) | null
): void {
  // This file is only used under ts-node.
  nodeInjectTestConnection(factory);
}

export function newTextConnection(): Connection<string> {
  // This file is only used under ts-node.
  return nodeNewTextConnection();
}

export function newBytesConnection(): Connection<ArrayBuffer> {
  // This file is only used in Node.js tests using ts-node.
  return nodeNewBytesConnection();
}

export function newBlobConnection(): Connection<Blob> {
  // This file is only used in Node.js tests using ts-node.
  return nodeNewBlobConnection();
}

export function newStreamConnection(): Connection<ReadableStream> {
  // This file is only used in Node.js tests using ts-node.
  return nodeNewStreamConnection();
}
